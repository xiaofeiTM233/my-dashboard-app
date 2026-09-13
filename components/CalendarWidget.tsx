"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { useListStyles } from "@/lib/useListStyles";

interface CalendarDayCell {
  date: string;
  day: number;
  inMonth: boolean;
  lunar: string | null;
  festivals: string[];
  term: string | null;
}

interface CalendarPayload {
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

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_FULL = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** 7 列共用宽度；格子约 4:3 */
const GRID_WIDTH = 500;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 格内农历只留日名，避免「八月廿二」被截断 */
function shortLunar(lunar: string | null): string {
  if (!lunar) return "";
  const m = lunar.match(/[月闰](.+)$/);
  return m ? m[1] : lunar;
}

function splitGz(hit: Pick<CalendarPayload, "gzYear" | "gzMonth" | "gzDate">): string | null {
  const parts = [hit.gzYear, hit.gzMonth, hit.gzDate].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join("");
}

/** 中中卡片：只请求当月一次；左当天详情，右当月网格 */
export default function CalendarWidget() {
  useListStyles();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [focusMonth, setFocusMonth] = useState<{ y: number; m: number } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clock = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      hours: pad(now.getHours()),
      minutes: pad(now.getMinutes()),
      seconds: pad(now.getSeconds()),
    };
  }, [now]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/calendar?date=${todayKey}`, { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: CalendarPayload;
        };
        if (cancelled || requestId !== requestIdRef.current) return;
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.message || "获取万年历失败");
        }
        setPayload(json.data);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "获取万年历失败");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  const didFocusToday = useRef(false);
  const [flashKey, setFlashKey] = useState(0);

  const focusToday = () => {
    const el = gridScrollRef.current;
    if (!el || !payload) return;
    const idx = payload.days.findIndex((d) => d.date === todayKey);
    if (idx < 0) return;
    const row = Math.floor(idx / 7);
    const firstCell = el.querySelector<HTMLElement>("[data-cal-cell]");
    const rowH = firstCell ? firstCell.offsetHeight + 4 : 58;
    el.scrollTo({ top: Math.max(0, row * rowH - 4), behavior: "smooth" });
    const anchor =
      payload.days[Math.min(payload.days.length - 1, row * 7 + 14)] ?? payload.days[idx];
    if (anchor) {
      const [yy, mm] = anchor.date.split("-").map(Number);
      queueMicrotask(() => setFocusMonth({ y: yy, m: mm }));
    }
    setFlashKey((k) => k + 1);
  };

  useEffect(() => {
    if (didFocusToday.current || !payload) return;
    const el = gridScrollRef.current;
    if (!el) return;
    const idx = payload.days.findIndex((d) => d.date === todayKey);
    if (idx < 0) return;
    const row = Math.floor(idx / 7);
    const firstCell = el.querySelector<HTMLElement>("[data-cal-cell]");
    const rowH = firstCell ? firstCell.offsetHeight + 4 : 58;
    el.scrollTop = Math.max(0, row * rowH - 4);
    didFocusToday.current = true;

    const anchor =
      payload.days[Math.min(payload.days.length - 1, row * 7 + 14)] ?? payload.days[idx];
    if (anchor) {
      const [yy, mm] = anchor.date.split("-").map(Number);
      queueMicrotask(() => setFocusMonth({ y: yy, m: mm }));
    }
  }, [payload, todayKey]);

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el || !payload) return;

    const update = () => {
      const cells = el.querySelectorAll<HTMLElement>("[data-cal-cell]");
      if (cells.length === 0) return;
      const rowH = cells[0].offsetHeight + 4;
      const rowsVisible = Math.max(1, Math.floor(el.clientHeight / rowH));
      const targetRowOffset = Math.min(2, rowsVisible - 1);
      const firstVisibleRow = Math.round(el.scrollTop / rowH);
      const targetIdx = (firstVisibleRow + targetRowOffset) * 7;
      const cell = payload.days[Math.min(payload.days.length - 1, Math.max(0, targetIdx))];
      if (!cell) return;
      const [yy, mm] = cell.date.split("-").map(Number);
      setFocusMonth((prev) => {
        if (prev && prev.y === yy && prev.m === mm) return prev;
        return { y: yy, m: mm };
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [payload]);

  const leftToday = useMemo(() => {
    if (!payload) return null;
    const [yy, mm, dd] = todayKey.split("-").map(Number);
    return {
      day: dd,
      month: mm,
      year: yy,
      weekday: WEEKDAY_FULL[new Date(yy, mm - 1, dd).getDay()],
      lunar: payload.lunar,
      term: payload.term,
      festivals: payload.festivals,
      gz: splitGz(payload),
      animal: payload.animal,
      suit: payload.suit,
      avoid: payload.avoid,
    };
  }, [payload, todayKey]);

  const monthLabel = focusMonth
    ? `${focusMonth.y}年${focusMonth.m}月`
    : payload
      ? `${payload.year}年${payload.month}月`
      : "";

  return (
    <WidgetCard className="h-full w-full" contentClassName="flex h-full w-full min-h-0 p-0">
      <div className="flex h-full w-full min-h-0">
        {/* 左：今天详情 */}
        <div className="cal-divider flex w-[40%] min-w-0 flex-col justify-center gap-3 overflow-y-auto px-5 py-4">
          {!leftToday && loading ? (
            <span className="cal-muted text-lg">加载中…</span>
          ) : error && !leftToday ? (
            <span className="cal-muted text-lg">{error}</span>
          ) : leftToday ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  <span className="cal-primary text-[64px] leading-none font-[family-name:var(--font-mind-demi-bold)]">
                    {leftToday.day}
                  </span>
                  <div className="flex flex-col leading-tight pb-1">
                    <span className="cal-primary text-[20px] font-medium">
                      {leftToday.weekday}
                    </span>
                    <span className="cal-secondary text-[15px]">
                      {leftToday.year}年{leftToday.month}月
                    </span>
                  </div>
                </div>
                <span className="cal-primary flex pb-1 font-[family-name:var(--font-mind-demi-bold)] text-[22px] leading-none">
                  <span>{clock.hours}</span>
                  <span>:</span>
                  <span>{clock.minutes}</span>
                  <span>:</span>
                  <span className="inline-block w-[2ch] text-left">{clock.seconds}</span>
                </span>
              </div>

              {leftToday.lunar ? (
                <p className="cal-primary text-[19px]">
                  农历{leftToday.lunar}
                  {leftToday.gz ? <span className="cal-secondary"> · {leftToday.gz}</span> : null}
                  {leftToday.animal ? (
                    <span className="cal-secondary"> · {leftToday.animal}年</span>
                  ) : null}
                </p>
              ) : null}

              {leftToday.term ? (
                <p className="cal-secondary text-[17px]">
                  节气
                  <span className="cal-primary ml-1.5 font-medium">{leftToday.term}</span>
                </p>
              ) : null}

              {leftToday.festivals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {leftToday.festivals.map((f) => (
                    <span key={f} className="cal-chip text-[15px]">
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}

              {leftToday.suit.length > 0 ? (
                <div className="cal-secondary text-[16px] leading-relaxed">
                  <span className="cal-tag-yi">宜</span>
                  <span className="cal-primary">{leftToday.suit.slice(0, 8).join(" ")}</span>
                </div>
              ) : null}

              {leftToday.avoid.length > 0 ? (
                <div className="cal-secondary text-[16px] leading-relaxed">
                  <span className="cal-tag-ji">忌</span>
                  <span className="cal-primary">{leftToday.avoid.slice(0, 8).join(" ")}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* 右：当月网格 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="cal-bar flex items-center justify-between px-4 py-2">
            <span className="cal-primary text-base font-medium">{monthLabel}</span>
            <button type="button" className="cal-festival text-sm" onClick={focusToday}>
              今天
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center overflow-hidden">
            <div
              className="cal-muted grid w-full shrink-0 grid-cols-7 pb-1.5 pr-[10px] pt-2 text-center text-[14px]"
              style={{ maxWidth: GRID_WIDTH }}
            >
              {WEEK_LABELS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="cal-scroll w-full pt-1 pb-2" ref={gridScrollRef} style={{ maxWidth: GRID_WIDTH }}>
              {loading && !payload ? (
                  <p className="cal-muted pt-6 text-center text-sm">加载中…</p>
                ) : error && !payload ? (
                  <p className="cal-muted pt-6 text-center text-sm">{error}</p>
                ) : (
                  <div className="grid grid-cols-7 gap-x-0 gap-y-1">
                  {(payload?.days ?? []).map((cell) => {
                    const isToday = cell.date === todayKey;
                    const [cy, cm] = cell.date.split("-").map(Number);
                    const inFocusMonth = focusMonth
                      ? cy === focusMonth.y && cm === focusMonth.m
                      : cell.inMonth;
                    const label =
                      cell.term || cell.festivals[0] || shortLunar(cell.lunar) || "";
                    const isHolidayLike = Boolean(cell.term || cell.festivals.length > 0);

                    const dayClass = isToday
                      ? "cal-today"
                      : inFocusMonth
                        ? "cal-primary"
                        : "cal-faint";
                    const labelClass = isToday
                      ? "cal-today"
                      : !inFocusMonth
                        ? "cal-faint"
                        : isHolidayLike
                          ? "cal-festival"
                          : "cal-secondary";

                    return (
                      <div
                        key={isToday ? `${cell.date}-f${flashKey}` : cell.date}
                        data-cal-cell
                        className={[
                          "flex aspect-[4/3] w-full flex-col items-center overflow-hidden px-1 pt-1.5 text-center",
                          isToday ? (flashKey > 0 ? "cal-today-box cal-flash" : "cal-today-box") : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span
                          className={[
                            dayClass,
                            "shrink-0 text-[16px] leading-none",
                            isToday ? "font-semibold" : "font-normal",
                          ].join(" ")}
                        >
                          {cell.day}
                        </span>
                        <span
                          className={`${labelClass} mt-1 w-full text-center text-[11px] leading-[1.25] break-all`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
