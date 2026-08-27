// components/grid/grid.tsx
"use client";

import {
  useCallback,
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { ComponentType } from "react";

// ==================== 类型定义 ====================

/**
 * 网格系统常量
 * 15 列 x 5 行，左右两侧各预留 1 列空白，因此实际可用区域为 13 列。
 */
export const GRID_COLUMNS = 15;
export const GRID_ROWS = 5;
/** 两侧预留的空白列数 */
export const GRID_PADDING_COLUMNS = 1;

/**
 * 单个卡片在网格中的位置与尺寸
 */
export interface WidgetPosition {
  /** 起始列（0 基，已计入左侧预留列） */
  col: number;
  /** 起始行（0 基） */
  row: number;
  /** 占用的列数 */
  span: number;
  /** 占用的行数 */
  rowSpan: number;
}

/**
 * 卡片预设：描述一种可放置到网格的卡片。
 * 每个预设携带一个渲染组件，便于在网格内自由组合。
 */
export interface WidgetPreset {
  /** 唯一标识，用于 React key 与拖拽 id */
  id: string;
  /** 展示名称 */
  name: string;
  /** 默认占位尺寸（要求正方形，故 span === rowSpan） */
  position: WidgetPosition;
  /** 该卡片的渲染组件 */
  component: ComponentType;
}

/**
 * 卡片实例：被放置到网格中的具体卡片
 */
export interface WidgetInstance extends WidgetPreset {
  /** 实例的唯一 id（同一预设可被放置多次） */
  instanceId: string;
}

// ==================== 预设注册表 ====================

import { blankCardPreset } from "@/components/cards/BlankCard";
import { hotListPresets } from "@/components/cards/HotListCard";

/**
 * 预设注册表。
 *
 * WidgetInstance 携带 component（函数），无法直接 JSON 序列化存进 localStorage。
 * 因此持久化时只存「布局信息」（instanceId + position），
 * 重建时用预设 id 关联回对应的 component。
 *
 * 每个预设的 id 同时也是「实例 id 的前缀」：instanceId 形如 `${presetId}-${n}`。
 */
export const widgetPresets: WidgetPreset[] = [
  ...hotListPresets,
  blankCardPreset,
];

/** 按预设 id 索引，便于 O(1) 查找 */
export const presetById: Record<string, WidgetPreset> = Object.fromEntries(
  widgetPresets.map((p) => [p.id, p])
);

/**
 * 从 instanceId 中提取它所属的预设 id。
 * instanceId 形如 `hot-2x3-list-rank-0`，去掉末尾的 `-{n}` 即得 presetId。
 * 若找不到匹配的预设，返回 null。
 */
export function presetIdOf(instanceId: string): string | null {
  for (const id of Object.keys(presetById)) {
    if (instanceId === id || instanceId.startsWith(`${id}-`)) {
      return id;
    }
  }
  return null;
}

// ==================== 布局存储 Hook ====================

/** localStorage key */
const STORAGE_KEY = "dashboard.layout.v1";

/**
 * 可持久化的布局条目：仅 instanceId + position（不含 component）。
 * component 在加载时按预设 id 关联回来。
 */
interface LayoutEntry {
  instanceId: string;
  position: WidgetPosition;
}

/** 由预设生成的初始实例（未拖动前的默认布局） */
function buildDefaultInstances(): WidgetInstance[] {
  return [
    ...widgetPresets.map((preset, index) => ({
      ...preset,
      instanceId: `${preset.id}-${index}`,
    })),
  ];
}

/** 把布局条目列表还原成带 component 的实例列表 */
function hydrate(entries: LayoutEntry[]): WidgetInstance[] {
  const result: WidgetInstance[] = [];
  for (const entry of entries) {
    const presetId = presetIdOf(entry.instanceId);
    if (!presetId) continue; // 预设已移除，丢弃
    const preset = presetById[presetId];
    result.push({
      ...preset,
      instanceId: entry.instanceId,
      position: entry.position,
    });
  }
  // 若布局为空（如旧数据清空），回退到默认
  return result.length ? result : buildDefaultInstances();
}

/** 从 localStorage 读取布局条目；失败或不存在时返回 null */
function readEntries(): LayoutEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as LayoutEntry[];
  } catch {
    return null;
  }
}

/**
 * 布局状态上下文。
 *
 * 之前 Home 与 GridDashboard 各自调用 useLayoutStore()，会各自持有独立的
 * state 副本。拖动只在 GridDashboard 的副本里更新并写入 localStorage，
 * 而 Home 副本的「自动保存」effect 又会用旧数据覆盖回去，导致移动后保存失效。
 *
 * 改用 Context 后，所有组件共享同一份 state，从根本上避免双副本互相覆盖。
 */
interface LayoutContextValue {
  instances: WidgetInstance[];
  setInstances: React.Dispatch<React.SetStateAction<WidgetInstance[]>>;
  saveLayout: (next: WidgetInstance[]) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

/**
 * 提供者：持有唯一一份布局状态。
 * - 初始用默认布局，挂载后再用 localStorage 覆盖。
 * - instances 变化后自动写入 localStorage（只此一处，避免重复保存/互相覆盖）。
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<WidgetInstance[]>(() =>
    buildDefaultInstances()
  );

  const saveLayout = useCallback((next: WidgetInstance[]) => {
    if (typeof window === "undefined") return;
    const entries: LayoutEntry[] = next.map((inst) => ({
      instanceId: inst.instanceId,
      position: inst.position,
    }));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      console.log("Saved instances to localStorage:", next);
    } catch {
      // 配额满或禁用时静默忽略
    }
  }, []);

  // 挂载后从 localStorage 加载已保存布局
  useEffect(() => {
    const entries = readEntries();
    if (entries && entries.length > 0) {
      const hydrated = hydrate(entries);
      console.log("Loaded instances from localStorage:", hydrated);
      setInstances(hydrated);
    } else {
      console.log("No localStorage data found, using default instances");
    }
  }, []);

  // 唯一一处自动保存：instances 变化即写回
  useEffect(() => {
    saveLayout(instances);
  }, [instances, saveLayout]);

  return (
    <LayoutContext.Provider value={{ instances, setInstances, saveLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

/**
 * 读取共享布局状态。必须在 <LayoutProvider> 内使用。
 */
export function useLayoutStore(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayoutStore 必须在 <LayoutProvider> 内使用");
  }
  return ctx;
}
