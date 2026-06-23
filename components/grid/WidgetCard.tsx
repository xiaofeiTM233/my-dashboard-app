// components/grid/WidgetCard.tsx
"use client";

import type { ReactNode } from "react";

interface WidgetCardProps {
  /** 卡片内容 */
  children?: ReactNode;
  /** 编辑模式下是否高亮可拖拽状态 */
  editing?: boolean;
  /** 是否处于被拖拽中 */
  dragging?: boolean;
  /** 透传的拖拽手柄属性（用于 dnd-kit 的 listeners / attributes） */
  handleProps?: Record<string, unknown>;
  /** 额外 className */
  className?: string;
}

/**
 * 卡片通用外壳：统一的圆角、玻璃拟态背景与边框。
 * 所有自定义卡片内容都渲染在此外壳内部，从而保证视觉一致性。
 */
export default function WidgetCard({
  children,
  editing = false,
  dragging = false,
  handleProps,
  className = "",
}: WidgetCardProps) {
  return (
    <div
      {...handleProps}
      className={[
        "widget-card glass-card",
        "relative flex h-full w-full flex-col overflow-hidden rounded-[16px]",
        "border-[1px] border-solid border-color-white border-opacity-40",
        "bg-color-m1 bg-opacity-60 transition-all duration-200",
        editing ? "cursor-grab active:cursor-grabbing hover:bg-opacity-80" : "",
        dragging ? "opacity-50 ring-2 ring-color-blue" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-full w-full items-center justify-center p-[12px]">
        {children}
      </div>
    </div>
  );
}
