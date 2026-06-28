// components/cards/HotListCard.tsx
"use client";

import { FireOutlined, RightOutlined } from "@ant-design/icons";
import HotList from "@/components/hotlist/HotList";
import { mockHotItems } from "@/components/hotlist/mockData";
import type { HotIndicator, HotSize, HotVariant } from "@/components/hotlist/types";
import type { WidgetPreset } from "@/components/grid/grid";

/**
 * 热搜卡片预设的渲染入参。
 * 通过工厂函数生成不同规格 / 形态 / 前置标识的卡片，便于在网格中自由组合。
 */
export interface HotListCardOptions {
  /** 卡片唯一 id */
  id: string;
  /** 展示名称 */
  name: string;
  /** 网格位置（要求正方形 span === rowSpan） */
  position: WidgetPreset["position"];
  /** 内容规格 */
  size?: HotSize;
  /** 渲染形态 */
  variant?: HotVariant;
  /** 前置标识类型 */
  indicator?: HotIndicator;
  /** 卡片标题 */
  title?: string;
}

/**
 * 根据配置生成一个热搜卡片预设。
 * 默认使用微博热搜风格模拟数据，后续可在组件内替换为真实数据。
 */
export function createHotListPreset(opts: HotListCardOptions): WidgetPreset {
  const {
    id,
    name,
    position,
    size = "2x3",
    variant = "list",
    indicator = "rank",
    title = "热搜榜",
  } = opts;

  function HotListCardContent() {
    return (
      <HotList
        items={mockHotItems}
        size={size}
        variant={variant}
        indicator={indicator}
        indicatorIcon={<FireOutlined />}
        title={
          <span className="flex items-center gap-[4px]">
            <FireOutlined style={{ color: "rgb(var(--color-red))" }} />
            {title}
          </span>
        }
        extra={
          <span className="flex items-center text-color-t3" style={{ fontSize: 11 }}>
            更多 <RightOutlined style={{ fontSize: 10 }} />
          </span>
        }
      />
    );
  }

  return { id, name, position, component: HotListCardContent };
}

/**
 * 一组示例预设：覆盖
 * - 2x2 / 2x3 / 3x3 三种规格
 * - list / card 两种形态
 * - rank / dot / icon 三种前置标识
 */
export const hotListPresets: WidgetPreset[] = [
  // 2x3：2 宽 × 3 高（竖长），列表形态
  createHotListPreset({
    id: "hot-2x3-list-rank",
    name: "热搜 · 2x3 列表",
    position: { col: 1, row: 0, span: 2, rowSpan: 3 },
    size: "2x3",
    variant: "list",
    indicator: "rank",
  }),
  // 2x2：2 宽 × 2 高（正方形），卡片形态
  createHotListPreset({
    id: "hot-2x2-card-dot",
    name: "热搜 · 2x2 卡片",
    position: { col: 3, row: 0, span: 2, rowSpan: 2 },
    size: "2x2",
    variant: "card",
    indicator: "dot",
  }),
  // 3x3：3 宽 × 3 高（大正方形），列表形态
  createHotListPreset({
    id: "hot-3x3-list-rank",
    name: "热搜 · 3x3 列表",
    position: { col: 5, row: 0, span: 3, rowSpan: 3 },
    size: "3x3",
    variant: "list",
    indicator: "icon",
  }),
];
