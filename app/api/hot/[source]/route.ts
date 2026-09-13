import type { NextRequest } from "next/server";
import { getHotSource, type HotSource } from "@/lib/hotSources";

/**
 * DailyHotApi 代理。
 *
 * 作用：
 * 1. 规避浏览器直连第三方接口时的跨域限制；
 * 2. 收敛「允许调用哪些信息源」，避免被当成任意 URL 代理；
 * 3. 做一层内存缓存，避免频繁请求上游。
 *
 * 默认使用官方公共实例，自建服务时设置环境变量即可：
 *   DAILYHOT_API_BASE=http://127.0.0.1:6688
 */

const API_BASE = (
  process.env.DAILYHOT_API_BASE || "https://daily-hot-api.02000721.xyz"
).replace(/\/+$/, "");

/** 内存缓存时长（上游自身还有 60 分钟缓存） */
const CACHE_TTL = 15 * 60 * 1000;
/** 上游请求超时 */
const UPSTREAM_TIMEOUT = 12_000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export const dynamic = "force-dynamic";

interface UpstreamItem {
  id?: string | number;
  title?: string;
  desc?: string;
  cover?: string;
  author?: string;
  hot?: number;
  timestamp?: number;
  url?: string;
  mobileUrl?: string;
}

interface UpstreamResponse {
  code?: number;
  name?: string;
  title?: string;
  type?: string;
  description?: string;
  link?: string;
  total?: number;
  updateTime?: string | number;
  fromCache?: boolean;
  message?: string;
  data?: UpstreamItem[];
}

interface HotItem {
  id: string;
  title: string;
  desc?: string;
  cover?: string;
  author?: string;
  hot?: number;
  timestamp?: number;
  url: string;
  mobileUrl?: string;
}

interface HotPayload {
  sourceId: string;
  name: string;
  type: string;
  description?: string;
  link?: string;
  total: number;
  updateTime?: string | number;
  fromCache?: boolean;
  items: HotItem[];
}

const memoryCache = new Map<string, { expiresAt: number; payload: HotPayload }>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source: sourceId } = await params;
  const source = getHotSource(sourceId);
  if (!source) {
    return fail(`不支持的信息源：${sourceId}`, 400);
  }

  const { searchParams } = request.nextUrl;
  const limit = parseLimit(searchParams.get("limit"));
  const force = searchParams.get("refresh") === "1";

  const cacheKey = `${source.id}:${limit}`;
  if (!force) {
    const hit = memoryCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return ok(hit.payload, true);
    }
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, UPSTREAM_TIMEOUT);

  try {
    const res = await fetch(
      `${API_BASE}/${encodeURIComponent(source.id)}?cache=false&limit=${limit}`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "DailyHot-Dashboard/1.0",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`上游服务返回 ${res.status}`);
    }

    const json = (await res.json()) as UpstreamResponse;
    if (typeof json.code === "number" && json.code !== 200) {
      throw new Error(json.message || `上游服务返回 ${json.code}`);
    }

    const payload = normalize(source, json, limit);
    memoryCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, payload });
    return ok(payload, false);
  } catch (error) {
    memoryCache.delete(cacheKey);
    if (timedOut) {
      return fail("请求上游服务超时，请稍后重试", 504);
    }
    const message = error instanceof Error ? error.message : "请求上游服务失败";
    return fail(message, 502);
  } finally {
    clearTimeout(timer);
  }
}

function normalize(
  source: HotSource,
  json: UpstreamResponse,
  limit: number,
): HotPayload {
  const raw = Array.isArray(json.data) ? json.data : [];
  const items: HotItem[] = raw.slice(0, limit).map((item, index) => {
    const url = item.url ?? "";
    return {
      id: String(item.id ?? `${source.id}-${index}`),
      title: (item.title ?? "").trim() || "无标题",
      desc: item.desc,
      cover: item.cover,
      author: item.author,
      hot: typeof item.hot === "number" && Number.isFinite(item.hot) ? item.hot : undefined,
      timestamp: typeof item.timestamp === "number" ? item.timestamp : undefined,
      url,
      mobileUrl: item.mobileUrl || url,
    };
  });

  return {
    sourceId: source.id,
    name: json.title || source.name,
    type: json.type || source.type,
    description: json.description,
    link: json.link,
    total: items.length,
    updateTime: json.updateTime,
    fromCache: json.fromCache,
    items,
  };
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function ok(data: HotPayload, fromCache: boolean) {
  return Response.json(
    { ok: true, fromCache, data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(message: string, status: number) {
  return Response.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
