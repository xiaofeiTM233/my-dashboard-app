// components/grid/types.ts
import type { ComponentType } from "react";

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
