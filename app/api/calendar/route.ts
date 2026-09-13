import type { NextRequest } from "next/server";

/**
 * 百度万年历代理：按客户端日期所在月份请求 `YYYY年M月`，
 * 返回当天详情 + 整月网格（含相邻月补齐日）。
 * 仅月粒度 query 有数据；响应为 application/json;charset=gbk。
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
  animal?: string;
  gzYear?: string;
  gzMonth?: string;
  gzDate?: string;
  suit?: string;
  avoid?: string;
}

export interface CalendarDayCell {
  date: string;
  day: number;
  inMonth: boolean;
  lunar: string | null;
  festivals: string[];
  term: string | null;
}

export interface CalendarPayload {
  date: string;
  year: number;
  month: number;
  weekday: string | null;
  lunar: string | null;
  festivals: string[];
  term: string | null;
  animal: string | null;
  gzYear: string | null;
  gzMonth: string | null;
  gzDate: string | null;
  suit: string[];
  avoid: string[];
  days: CalendarDayCell[];
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
    const almanac = await loadMonth(y, m);
    const byDate = indexByDate(almanac);
    const hit = byDate.get(key);

    if (!hit) {
      return fail(`万年历未返回 ${key} 的数据`, 404);
    }

    const payload: CalendarPayload = {
      date: key,
      year: y,
      month: m,
      weekday: emptyToNull(hit.cnDay),
      lunar: formatLunar(hit),
      festivals: splitFestivals(hit.festivalList),
      term: emptyToNull(hit.term),
      animal: emptyToNull(hit.animal),
      gzYear: emptyToNull(hit.gzYear),
      gzMonth: emptyToNull(hit.gzMonth),
      gzDate: emptyToNull(hit.gzDate),
      suit: splitYiJi(hit.suit),
      avoid: splitYiJi(hit.avoid),
      days: buildContinuousDays(y, m, byDate),
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

    // 百度 Content-Type 为 application/json;charset=gbk，按 UTF-8 解会乱码
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

function indexByDate(days: AlmanacDay[]): Map<string, AlmanacDay> {
  const map = new Map<string, AlmanacDay>();
  for (const item of days) {
    const y = Number(item.year);
    const m = Number(item.month);
    const d = Number(item.day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) continue;
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

/**
 * 接口 almanac 自带相邻月数据：按日期排序后全部连续输出，
 * 开头补到周日保证与星期表头对齐；不裁掉「今天」之前的日期。
 */
function buildContinuousDays(
  year: number,
  month: number,
  byDate: Map<string, AlmanacDay>,
): CalendarDayCell[] {
  const keys = [...byDate.keys()].sort();
  if (keys.length === 0) return [];

  const [fy, fm, fd] = keys[0].split("-").map(Number);
  const first = new Date(fy, fm - 1, fd);
  const pad = first.getDay();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < pad; i++) {
    const cur = new Date(fy, fm - 1, fd - (pad - i));
    cells.push({
      date: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
      day: cur.getDate(),
      inMonth: false,
      lunar: null,
      festivals: [],
      term: null,
    });
  }

  for (const key of keys) {
    const item = byDate.get(key)!;
    const [yy, mm, dd] = key.split("-").map(Number);
    cells.push({
      date: key,
      day: dd,
      inMonth: yy === year && mm === month,
      lunar: formatLunar(item),
      festivals: splitFestivals(item.festivalList),
      term: emptyToNull(item.term),
    });
  }

  return cells;
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

/** 宜忌字段形如 "理发.沐浴.祭祀"；"无" 表示无内容 */
function splitYiJi(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[.．·、,，]/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "无");
}

function emptyToNull(value?: string): string | null {
  const t = (value ?? "").trim();
  return t ? t : null;
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
