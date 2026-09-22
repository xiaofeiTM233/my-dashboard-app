"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { getDateKey, useCalendar, type CalendarPayload } from "@/lib/calendarCache";
import { useListStyles } from "@/lib/useListStyles";

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_FULL = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** 数组顺序即白条从左到右的顺序 */
const LEFT_PANEL_MODES = [
  { id: "festival", label: "节日节气" },
  { id: "yiji", label: "宜忌" },
  { id: "blank", label: "空白" },
] as const;

type LeftPanelMode = (typeof LEFT_PANEL_MODES)[number]["id"];

const GRID_WIDTH = 500;

/** 只取农历日名，避免格内被截断 */
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

/** 高亮月份：可见首行含「今天」→ 本月，否则取首行下方 rowOffset 行所在月 */
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

export default function CalendarWidget() {
  useListStyles();
  const [now, setNow] = useState(() => new Date());
  // 跨零点自动换日；字符串按值比较，不必 memo
  const todayKey = getDateKey(now);
  const { payload, loading, error } = useCalendar(todayKey);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [focusMonth, setFocusMonth] = useState<{ y: number; m: number } | null>(null);
  const [leftPanel, setLeftPanel] = useState<LeftPanelMode>("yiji");

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

  /** 存日期而非布尔量：跨日后要再次聚焦 */
  const focusedDateRef = useRef<string | null>(null);
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
    // 今天所在行即滚动后首行 → 高亮本月（被夹紧时由滚动监听修正）
    const target = resolveFocusMonth(payload, todayKey, row, 2);
    if (target) queueMicrotask(() => setFocusMonth(target));
    setFlashKey((k) => k + 1);
  };

  useEffect(() => {
    // 挂载与跨日各聚焦一次，同一日期内不重复
    if (!payload || focusedDateRef.current === todayKey) return;
    const el = gridScrollRef.current;
    if (!el) return;
    const idx = payload.days.findIndex((d) => d.date === todayKey);
    if (idx < 0) return;
    const row = Math.floor(idx / 7);
    const firstCell = el.querySelector<HTMLElement>("[data-cal-cell]");
    const rowH = firstCell ? firstCell.offsetHeight + 4 : 58;
    el.scrollTop = Math.max(0, row * rowH - 4);
    focusedDateRef.current = todayKey;

    // 以滚动后的实际首行为准
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
        {/* 左：今天详情（上=日期信息，下=可切换区） */}
        <div className="cal-divider flex w-[40%] min-w-0 flex-col gap-2 px-5 py-2">
          {!leftToday && loading ? (
            <span className="cal-muted m-auto text-lg">加载中…</span>
          ) : error && !leftToday ? (
            <span className="cal-muted m-auto text-lg">{error}</span>
          ) : leftToday ? (
            <>
              {/* 上块：日期信息 */}
              <div
                className="-mx-5 flex min-h-0 flex-[1.5] flex-col px-5"
                style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.4)" }}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                  <div className="my-auto flex flex-col gap-2">
                    <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
                      <div className="flex items-end gap-2">
                        <span className="cal-primary text-[clamp(48px,6.4vh,64px)] leading-none font-[family-name:var(--font-mind-demi-bold)]">
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
                      <p className="cal-primary text-dot text-[19px]">
                        农历{leftToday.lunar}
                        {leftToday.gz ? (
                          <span className="cal-secondary"> · {leftToday.gz}</span>
                        ) : null}
                        {leftToday.animal ? (
                          <span className="cal-secondary"> · {leftToday.animal}年</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 下块：可切换区 */}
              <div className="flex min-h-0 flex-1 flex-col">
                {/* 内容区：统一 min-h，切换模式时不位移 */}
                <div className="flex min-h-[58px] flex-col gap-1.5">
                  {leftPanel === "festival" ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      {leftToday.term ? (
                        <span className="cal-secondary text-[15px]">
                          节气
                          <span className="cal-primary ml-1.5 font-medium">{leftToday.term}</span>
                        </span>
                      ) : null}
                      {leftToday.festivals.map((f) => (
                        <span key={f} className="cal-chip text-[14px]">
                          {f}
                        </span>
                      ))}
                      {!leftToday.term && leftToday.festivals.length === 0 ? (
                        <span className="cal-muted text-[14px]">今日无节日 · 节气</span>
                      ) : null}
                    </div>
                  ) : null}

                  {leftPanel === "yiji" ? (
                    <>
                      {leftToday.suit.length > 0 ? (
                        <div className="flex items-center text-[16px]">
                          <span className="cal-tag-yi leading-none">宜</span>
                          <span className="cal-primary min-w-0 text-dot leading-relaxed">
                            {leftToday.suit.slice(0, 8).join(" ")}
                          </span>
                        </div>
                      ) : null}

                      {leftToday.avoid.length > 0 ? (
                        <div className="flex items-center text-[16px]">
                          <span className="cal-tag-ji leading-none">忌</span>
                          <span className="cal-primary min-w-0 text-dot leading-relaxed">
                            {leftToday.avoid.slice(0, 8).join(" ")}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {/* 白条：一个模式一条，mt-auto 钉在下半区底部 */}
                <div className="mt-auto flex gap-2 pt-2">
                  {LEFT_PANEL_MODES.map((mode) => {
                    const active = mode.id === leftPanel;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        title={mode.label}
                        aria-label={mode.label}
                        aria-pressed={active}
                        onClick={() => setLeftPanel(mode.id)}
                        className="group h-[16px] flex-1 cursor-pointer"
                        style={{ paddingTop: 6 }}
                      >
                        {/* 固定高度内生长，hover 不撑动布局 */}
                        <span
                          className={[
                            "block h-[4px] w-full rounded-full bg-color-white",
                            "transition-all duration-150 group-hover:h-[10px] group-hover:opacity-100",
                            active ? "opacity-100" : "opacity-40",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
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
