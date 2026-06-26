// components/hotlist/types.ts
import type { ReactNode } from "react";

/**
 * 热搜类列表 —— 数据模型
 * 用于「热搜榜 / 排行榜 / 趋势榜」一类的卡片内容。
 * 后续接入真实数据时，只需把后端返回结构映射为 HotItem[] 即可。
 */

/** 条目标签的类型，决定标签的配色 */
export type HotTagType = "hot" | "new" | "boil" | "ad" | "normal";

/** 条目右侧的标签（如「热 / 新 / 沸 / 广」） */
export interface HotTag {
  /** 标签文字 */
  text: string;
  /** 标签配色类型 */
  type?: HotTagType;
}

/** 单条热搜 / 榜单条目 */
export interface HotItem {
  /** 唯一 id，用作 React key */
  id: string;
  /** 主标题 */
  title: string;
  /** 热度值（数字越大越靠前，可缺省） */
  hot?: number;
  /** 右侧标签 */
  tag?: HotTag;
  /** 点击跳转链接 */
  url?: string;
  /**
   * 缩略图 / 自定义图标。
   * - 当 indicator="icon" 时作为前置图标
   * - 当 variant="card" 时作为卡片缩略图
   */
  icon?: ReactNode;
}

/**
 * 前置标识类型（每条目最左侧展示什么）
 * - rank  : 序号排名（1/2/3 高亮，其余灰显）
 * - dot   : 单纯圆点
 * - icon  : 调用方传入的自定义图标（见 HotListProps.indicatorIcon）
 * - none  : 不展示
 */
export type HotIndicator = "rank" | "dot" | "icon" | "none";

/** 内容网格规格，决定展示的条目数量与排布 */
export type HotSize = "2x2" | "2x3" | "3x3";

/** 渲染形态：列表（纵向逐条）/ 卡片（迷你卡片网格） */
export type HotVariant = "list" | "card";

/** HotList 组件的全部入参 */
export interface HotListProps {
  /** 数据源 */
  items: HotItem[];
  /** 内容规格，默认 "2x3" */
  size?: HotSize;
  /** 渲染形态，默认 "list" */
  variant?: HotVariant;
  /** 前置标识类型，默认 "rank" */
  indicator?: HotIndicator;
  /** 当 indicator="icon" 时使用的前置图标 */
  indicatorIcon?: ReactNode;
  /** 卡片标题（展示在左上角） */
  title?: ReactNode;
  /** 卡片右上角操作区（如「更多」） */
  extra?: ReactNode;
  /** 点击条目回调；未提供且条目带 url 时，默认新标签打开 */
  onItemClick?: (item: HotItem) => void;
  /** 自定义 className */
  className?: string;
}
