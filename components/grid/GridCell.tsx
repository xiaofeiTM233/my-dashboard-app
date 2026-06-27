// components/grid/GridCell.tsx
"use client";

import { useDroppable } from "@dnd-kit/core";

interface GridCellProps {
  /** 单元格在网格中的列索引（0 基） */
  col: number;
  /** 单元格在网格中的行索引（0 基） */
  row: number;
  /** 是否处于编辑模式（仅在编辑模式渲染放置高亮） */
  editing: boolean;
}

/**
 * 网格中的一个空白单元格，作为拖拽放置目标。
 * 仅在编辑模式下可见并启用放置能力。
 */
export default function GridCell({ col, row, editing }: GridCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    disabled: !editing,
    data: { col, row },
  });

  if (!editing) return null;

  return (
    <div
      ref={setNodeRef}
      data-cell="1"
      style={{
        gridColumnStart: col + 1,
        gridColumnEnd: "span 1",
        gridRowStart: row + 1,
        gridRowEnd: "span 1",
      }}
      className={[
        "flex items-center justify-center rounded-[16px] border-[1px] border-dashed",
        "border-color-white border-opacity-30 transition-colors",
        isOver ? "bg-color-blue bg-opacity-20" : "bg-transparent",
      ].join(" ")}
    >
      {isOver && (
        <span className="text-[12px] text-color-t3 text-opacity-60">
          放置
        </span>
      )}
    </div>
  );
}
