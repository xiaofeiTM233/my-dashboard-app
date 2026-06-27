// components/grid/GridDashboard.tsx
"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from "@dnd-kit/core";
import DraggableWidget from "@/components/grid/DraggableWidget";
import GridCell from "@/components/grid/GridCell";
import { blankCardPreset } from "@/components/grid/presets/BlankCard";
import { hotListPresets } from "@/components/grid/presets/HotListCard";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  GRID_PADDING_COLUMNS,
  type WidgetInstance,
} from "@/components/grid/types";

interface GridDashboardProps {
  /** 是否处于编辑模式（由外部浮动按钮控制） */
  editing: boolean;
}

/**
 * 卡片式网格仪表盘（卡片视图）。
 * - 网格系统：15 列 x 5 行，左右各预留 1 列空白。
 * - 所有卡片均为正方形。
 * - 编辑模式下支持卡片在网格内的自由拖拽与放置。
 */
export default function GridDashboard({ editing }: GridDashboardProps) {
  // 卡片实例列表。
  // 默认展示三个热搜卡片示例（2x3 列表 / 2x2 卡片 / 3x3 列表），
  // 同时保留一个 1x1 空白预设卡片示例。
  const [instances, setInstances] = useState<WidgetInstance[]>(() => [
    ...hotListPresets.map((preset, index) => ({
      ...preset,
      instanceId: `${preset.id}-${index}`,
    })),
    {
      ...blankCardPreset,
      instanceId: `${blankCardPreset.id}-0`,
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // 用碰撞检测算出的 over 就是「鼠标松手时所在的 cell」，
    // 它同时驱动放置提示（isOver）和最终落点 —— 单一数据源，所见即所得。
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("cell-")) return;

    const [, colStr, rowStr] = overId.split("-");
    const targetCol = Number(colStr);
    const targetRow = Number(rowStr);

    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.instanceId !== String(active.id)) return inst;
        // 卡片左上角吸附到鼠标所在格，并 clamp 到可用区
        const minCol = GRID_PADDING_COLUMNS;
        const maxCol = GRID_COLUMNS - GRID_PADDING_COLUMNS - inst.position.span;
        const minRow = 0;
        const maxRow = GRID_ROWS - inst.position.rowSpan;
        return {
          ...inst,
          position: {
            ...inst.position,
            col: Math.max(minCol, Math.min(maxCol, targetCol)),
            row: Math.max(minRow, Math.min(maxRow, targetRow)),
          },
        };
      })
    );
  };

  // 空白单元格：除去左右预留列后的可用区域
  const cells = useMemo(() => {
    const result: { col: number; row: number }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (
        let col = GRID_PADDING_COLUMNS;
        col < GRID_COLUMNS - GRID_PADDING_COLUMNS;
        col++
      ) {
        result.push({ col, row });
      }
    }
    return result;
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div
        className={[
          "grid h-full w-full gap-[12px] px-[12px] pb-[24px] transition-opacity duration-200",
          editing ? "opacity-90" : "opacity-100",
        ].join(" ")}
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
          gridAutoFlow: "row",
        }}
      >
        {cells.map(({ col, row }) => (
          <GridCell key={`cell-${col}-${row}`} col={col} row={row} editing={editing} />
        ))}

        {instances.map((instance) => (
          <DraggableWidget
            key={instance.instanceId}
            instance={instance}
            editing={editing}
          />
        ))}
      </div>
    </DndContext>
  );
}

