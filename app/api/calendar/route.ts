import type { NextRequest } from "next/server";

/**
 * 百度万年历代理：query 按客户端日期所在月份请求，再从 almanac 中取当天。
 * 仅月粒度 `YYYY年M月` 有数据；日粒度 query 会返回空 data。
 */

const UPSTREAM = "https://opendata.baidu.com/api.php";
const CACHE_TTL = 12 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT = 12_000;

export const dynamic = "force-dynamic";

interface AlmanacDay {
  year?: string;
  month?: string;
  day?: string;
  lDate?: string;
  lMonth?: string;
  festivalList?: string;
  cnDay?: string;
  term?: string;
}

interface CalendarPayload {
  date: string;
  lunar: string | null;
  festivals: string[];
}

const monthCache = new Map<string, { expiresAt: number; days: AlmanacDay[] }>();

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const parsed = parseDate(dateParam);
  if (!parsed) {
    return fail("请提供合法的 date 参数（YYYY-MM-DD）", 400);
  }

  const { y, m, d, key } = parsed;
  const monthKey = `${y}-${m}`;

  try {
    const days = await loadMonth(y, m);
    const hit = days.find(
      (item) =>
        Number(item.year) === y &&
        Number(item.month) === m &&
        Number(item.day) === d,
    );

    if (!hit) {
      return fail(`万年历未返回 ${key} 的数据`, 404);
    }

    const payload: CalendarPayload = {
      date: key,
      lunar: formatLunar(hit),
      festivals: splitFestivals(hit.festivalList),
    };
    return ok(payload, monthCache.has(monthKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求万年历失败";
    return fail(message, 502);
  }
}

function parseDate(value: string | null): { y: number; m: number; d: number; key: string } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

async function loadMonth(year: number, month: number): Promise<AlmanacDay[]> {
  const cacheKey = `${year}-${month}`;
  const hit = monthCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.days;
  }

  const query = `${year}年${month}月`;
  const url = new URL(UPSTREAM);
  url.searchParams.set("query", query);
  url.searchParams.set("resource_id", "39043");
  url.searchParams.set("format", "json");
  url.searchParams.set("tn", "wisetpl");

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, UPSTREAM_TIMEOUT);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      throw new Error(`上游服务返回 ${res.status}`);
    }

    // 百度 Content-Type 为 application/json;charset=gbk，res.json() 按 UTF-8 解会乱码
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buf);
    const json = JSON.parse(text) as {
      data?: Array<{ almanac?: AlmanacDay[] }>;
    };
    const days = json.data?.flatMap((block) => block.almanac ?? []) ?? [];
    if (days.length === 0) {
      throw new Error("上游未返回万年历数据");
    }

    monthCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, days });
    return days;
  } catch (error) {
    monthCache.delete(cacheKey);
    if (timedOut) {
      throw new Error("请求万年历超时，请稍后重试");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function formatLunar(day: AlmanacDay): string | null {
  const month = (day.lMonth ?? "").trim();
  const date = (day.lDate ?? "").trim();
  if (!date) return null;
  return month ? `${month}月${date}` : date;
}

function splitFestivals(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ok(data: CalendarPayload, fromCache: boolean) {
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
