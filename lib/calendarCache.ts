"use client";

import { useEffect, useState } from "react";

/**
 * 日历数据的浏览器端缓存。
 *
 * 目标：同一自然日内，组件因切换视图重新挂载、或页面刷新，都不再重复请求
 * `/api/calendar`；只有「换日」导致日期键变化时缓存才失效并重新请求。
 *
 * 两级缓存：
 * 1. 模块内存缓存：同一页面会话内跨组件、跨挂载复用，命中时首帧即有数据（不出现「加载中」闪烁）；
 * 2. localStorage：同一天内刷新页面后仍可复用，避免再走一次网络请求。
 */

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

const STORAGE_KEY = "dashboard:calendar:v1";

/** 进程内缓存：按日期键存放，切视图重新挂载时直接命中 */
const memoryCache = new Map<string, CalendarPayload>();

/** 并发去重：同一日期同时发起的多次请求合并为一次 */
const inflightRequests = new Map<string, Promise<CalendarPayload>>();

/** 本地日期键（YYYY-MM-DD）。不用 toISOString，避免 UTC 偏移造成跨日 */
export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 只读内存缓存，可在 useState 惰性初始化里安全调用：
 * 服务端渲染时内存为空返回 null，不会造成 hydration 不一致。
 */
export function peekCalendar(dateKey: string): CalendarPayload | null {
  if (!dateKey) return null;
  return memoryCache.get(dateKey) ?? null;
}

/** 读 localStorage；仅在 effect 中调用，日期不匹配即视为失效 */
export function readStoredCalendar(dateKey: string): CalendarPayload | null {
  if (typeof window === "undefined" || !dateKey) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { date?: string; payload?: CalendarPayload } | null;
    if (!entry || entry.date !== dateKey || !entry.payload) return null;
    return entry.payload;
  } catch {
    return null;
  }
}

/** 写入内存 + localStorage，键为日期，换日后旧数据自然不再命中 */
export function saveCalendar(dateKey: string, payload: CalendarPayload): void {
  if (!dateKey || !payload) return;
  memoryCache.set(dateKey, payload);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: dateKey, payload }));
  } catch {
    // 隐私模式 / 超出配额：放弃持久化，内存缓存依旧生效
  }
}

/** 清空缓存（调试或需要强制拉取时使用） */
export function clearCalendarCache(): void {
  memoryCache.clear();
  inflightRequests.clear();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}

/** 请求 /api/calendar 并写入缓存；同日期并发请求只打一次接口 */
export function requestCalendar(dateKey: string): Promise<CalendarPayload> {
  const existing = inflightRequests.get(dateKey);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(`/api/calendar?date=${dateKey}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      data?: CalendarPayload;
    } | null;
    if (!res.ok || !json?.ok || !json.data) {
      throw new Error(json?.message || "获取万年历失败");
    }
    saveCalendar(dateKey, json.data);
    return json.data;
  })();

  inflightRequests.set(dateKey, promise);
  const settle = () => {
    if (inflightRequests.get(dateKey) === promise) inflightRequests.delete(dateKey);
  };
  promise.then(settle, settle);
  return promise;
}

export interface CalendarState {
  payload: CalendarPayload | null;
  loading: boolean;
  error: string | null;
}

interface CalendarStoreState extends CalendarState {
  /** 当前 state 所属的日期键，用于识别「已换日但数据尚未到达」 */
  key: string;
}

function initStoreState(dateKey: string): CalendarStoreState {
  const cached = peekCalendar(dateKey);
  return { key: dateKey, payload: cached, loading: Boolean(dateKey) && !cached, error: null };
}

/**
 * 订阅某一天（dateKey）的日历数据。
 *
 * - 内存 / localStorage 任一命中都不发请求，换视图、同日刷新都是零请求；
 * - 换日（dateKey 变化）时缓存不命中，自动重新请求；
 * - 状态提交统一走微任务 / Promise 回调，避免在 effect 中同步 setState 造成级联渲染。
 */
export function useCalendar(dateKey: string): CalendarState {
  const [state, setState] = useState<CalendarStoreState>(() => initStoreState(dateKey));

  useEffect(() => {
    if (!dateKey) return;

    let cancelled = false;

    // 1) 内存缓存：切视图重新挂载时命中，首帧即有数据
    const inMemory = peekCalendar(dateKey);
    if (inMemory) {
      queueMicrotask(() => {
        if (cancelled) return;
        setState((prev) =>
          prev.key === dateKey && prev.payload === inMemory
            ? prev
            : { key: dateKey, payload: inMemory, loading: false, error: null },
        );
      });
      return () => {
        cancelled = true;
      };
    }

    // 2) localStorage：同一天内刷新过页面时命中，无需再请求
    const stored = readStoredCalendar(dateKey);
    if (stored) {
      saveCalendar(dateKey, stored);
      queueMicrotask(() => {
        if (cancelled) return;
        setState({ key: dateKey, payload: stored, loading: false, error: null });
      });
      return () => {
        cancelled = true;
      };
    }

    // 3) 无缓存（首次加载或已换日）：真正请求
    requestCalendar(dateKey).then(
      (data) => {
        if (cancelled) return;
        setState({ key: dateKey, payload: data, loading: false, error: null });
      },
      (err: unknown) => {
        if (cancelled) return;
        setState({
          key: dateKey,
          payload: null,
          loading: false,
          error: err instanceof Error ? err.message : "获取万年历失败",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  // 换日的首个渲染周期里 state 仍属于旧日期，此时对外呈现「加载中」，避免新旧日期数据混用
  if (state.key !== dateKey) {
    return { payload: null, loading: Boolean(dateKey), error: null };
  }
  return { payload: state.payload, loading: state.loading, error: state.error };
}
