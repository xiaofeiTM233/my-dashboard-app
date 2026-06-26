// components/grid/GridDashboard.tsx
"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
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
    if (!over) return;

    // 放置目标是网格单元格（id 形如 `cell-{col}-{row}`）
    const overId = String(over.id);
    if (!overId.startsWith("cell-")) return;

    const [, colStr, rowStr] = overId.split("-");
    const col = Number(colStr);
    const row = Number(rowStr);

    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === String(active.id)
          ? {
              ...inst,
              position: {
                ...inst.position,
                // 以放置单元格为左上角，保持原有跨度
                col,
                row,
              },
            }
          : inst
      )
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
      collisionDetection={closestCenter}
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

