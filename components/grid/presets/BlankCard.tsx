// components/grid/presets/BlankCard.tsx
"use client";

import { PlusOutlined } from "@ant-design/icons";
import type { WidgetPreset } from "@/components/grid/grid";

/**
 * 空白卡片内容：1x1 正方形占位，作为预设卡片示例。
 * 在编辑模式下展示「+」以暗示可被替换/编辑。
 */
function BlankCardContent() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-color-t3">
      <PlusOutlined style={{ fontSize: 24 }} />
    </div>
  );
}

/**
 * 1x1 空白预设卡片示例
 */
export const blankCardPreset: WidgetPreset = {
  id: "blank-1x1",
  name: "空白卡片",
  position: { col: 1, row: 0, span: 1, rowSpan: 1 },
  component: BlankCardContent,
};

export default BlankCardContent;
