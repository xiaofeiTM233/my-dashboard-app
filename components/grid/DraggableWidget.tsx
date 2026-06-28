// components/grid/DraggableWidget.tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import WidgetCard from "@/components/grid/WidgetCard";
import type { WidgetInstance } from "@/components/grid/grid";

interface DraggableWidgetProps {
  instance: WidgetInstance;
  editing: boolean;
}

/**
 * 将卡片实例放置到网格的指定位置，并在编辑模式下支持拖拽。
 * 非编辑模式下，卡片为静态展示。
 */
export default function DraggableWidget({
  instance,
  editing,
}: DraggableWidgetProps) {
  const { instanceId, position, component: Content } = instance;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: instanceId,
      disabled: !editing,
      data: { instance },
    });

  const style: React.CSSProperties = {
    gridColumnStart: position.col + 1,
    gridColumnEnd: `span ${position.span}`,
    gridRowStart: position.row + 1,
    gridRowEnd: `span ${position.rowSpan}`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "pointer-events-none" : ""}
    >
      <WidgetCard
        editing={editing}
        dragging={isDragging}
        handleProps={editing ? { ...attributes, ...listeners } : undefined}
      >
        <Content />
      </WidgetCard>
    </div>
  );
}
