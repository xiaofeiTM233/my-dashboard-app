// components/WidgetCard.tsx
"use client";

import type { ReactNode } from "react";

interface WidgetCardProps {
  /** 卡片内容 */
  children?: ReactNode;
  /** 额外 className */
  className?: string;
  /** 内容容器 className，默认整体居中 */
  contentClassName?: string;
}

/**
 * 卡片通用外壳：统一的圆角、玻璃拟态背景与边框。
 */
export default function WidgetCard({
  children,
  className = "",
  contentClassName,
}: WidgetCardProps) {
  return (
    <div
      className={[
        "widget-card glass-card",
        "relative flex h-full w-full flex-col overflow-hidden rounded-[16px]",
        "border-[1px] border-solid border-color-white border-opacity-40",
        "bg-color-m1 bg-opacity-60 transition-all duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={
          contentClassName ??
          "flex h-full w-full items-center justify-center p-[12px]"
        }
      >
        {children}
      </div>
    </div>
  );
}
