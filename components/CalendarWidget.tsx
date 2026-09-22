"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { getDateKey, useCalendar, type CalendarPayload } from "@/lib/calendarCache";
import { useListStyles } from "@/lib/useListStyles";

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_FULL = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** 7 列共用宽度；格子约 4:3 */
const GRID_WIDTH = 500;

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

/**
 * 解析高亮月份（顶部标签 + 网格内非本月淡显的依据）。
 *
 * 规则：可见首行包含「今天」时高亮【本月】，不再由下方行推导；
 * 否则取首行下方 offset 行（滚动区中部）所在月份。
 */
function resolveFocusMonth(
  payload: CalendarPayload,
  todayKey: string,
  firstRow: number,
  rowOffset: number,
): { y: number; m: number } | null {
  const row = Math.max(0, firstRow);
  const rowCells = payload.days.slice(row * 7, row * 7 + 7);
  if (rowCells.some((cell) => cell.date === todayKey)) {
    return { y: payload.year, m: payload.month };
  }
  const cell = payload.days[Math.min(payload.days.length - 1, (row + rowOffset) * 7)];
  if (!cell) return null;
  const [y, m] = cell.date.split("-").map(Number);
  return { y, m };
}

/** 中中卡片：只请求当月一次；左当天详情，右当月网格 */
export default function CalendarWidget() {
  useListStyles();
  const [now, setNow] = useState(() => new Date());
  // 跟随系统日期：跨零点自动换日，缓存随之失效并重新拉取；
  // 每秒重算成本极低，且字符串按值比较，依赖它的 effect 不会被重复触发
  const todayKey = getDateKey(now);
  const { payload, loading, error } = useCalendar(todayKey);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [focusMonth, setFocusMonth] = useState<{ y: number; m: number } | null>(null);

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
    // 今天所在行即滚动后的首行 → 按规则高亮本月（若滚动被夹紧，由滚动监听修正）
    const target = resolveFocusMonth(payload, todayKey, row, 2);
    if (target) queueMicrotask(() => setFocusMonth(target));
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

    // 以滚动后的实际首行为准（可能被夹紧）：含「今天」则高亮本月
    const firstVisibleRow = Math.round(el.scrollTop / rowH);
    const target = resolveFocusMonth(payload, todayKey, firstVisibleRow, 2);
    if (target) queueMicrotask(() => setFocusMonth(target));
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
      const target = resolveFocusMonth(payload, todayKey, firstVisibleRow, targetRowOffset);
      if (!target) return;
      setFocusMonth((prev) => {
        if (prev && prev.y === target.y && prev.m === target.m) return prev;
        return target;
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [payload, todayKey]);

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
