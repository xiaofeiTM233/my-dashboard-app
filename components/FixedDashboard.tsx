// components/FixedDashboard.tsx
"use client";

import HotList from "@/components/HotList";
import SearchBar from "@/components/SearchBar";
import TodoList from "@/components/TodoList";
import WidgetCard from "@/components/WidgetCard";

interface PlaceholderCardProps {
  label: string;
}

function PlaceholderCard({ label }: PlaceholderCardProps) {
  return (
    <WidgetCard className="h-full w-full">
      <span className="text-lg font-medium text-color-t3">{label}</span>
    </WidgetCard>
  );
}

/**
 * 固定布局仪表盘（卡片视图）。
 * 三列三行网格：中间列第 1 行为搜索栏，其余为卡片。
 * 左 / 右上角为跨两行的高卡片。
 */
export default function FixedDashboard() {
  return (
    <div className="h-full w-full" style={{ padding: "4em" }}>
      <div
        className="grid h-full w-full"
        style={{
          gap: "2em",
          gridTemplateColumns: "1fr 2fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr",
        }}
      >
        {/* 左上：跨第 1-2 行，滴答清单本周任务 */}
        <div className="min-h-0 min-w-0" style={{ gridColumn: 1, gridRow: "1 / 3" }}>
          <TodoList />
        </div>

        {/* 中上：搜索栏（建议为绝对定位浮层，不影响居中） */}
        <div
          className="relative z-10 flex min-h-0 items-center justify-center"
          style={{ gridColumn: 2, gridRow: 1 }}
        >
          <SearchBar
            className="relative flex h-full w-full max-w-[568px] items-center transition-opacity duration-100 focus-within:opacity-100"
            style={{ width: "567.6px", maxWidth: "100%", height: "100%" }}
          />
        </div>

        {/* 右上：跨第 1-2 行的高卡片，接入 DailyHotApi 热榜 */}
        <div
          className="min-h-0 min-w-0"
          style={{ gridColumn: 3, gridRow: "1 / 3" }}
        >
          <HotList />
        </div>

        {/* 中中 */}
        <div className="min-h-0" style={{ gridColumn: 2, gridRow: 2 }}>
          <PlaceholderCard label="中中卡片" />
        </div>

        {/* 左下 */}
        <div className="min-h-0" style={{ gridColumn: 1, gridRow: 3 }}>
          <PlaceholderCard label="左下卡片" />
        </div>

        {/* 中下 */}
        <div className="min-h-0" style={{ gridColumn: 2, gridRow: 3 }}>
          <PlaceholderCard label="中下卡片" />
        </div>

        {/* 右下 */}
        <div className="min-h-0" style={{ gridColumn: 3, gridRow: 3 }}>
          <PlaceholderCard label="右下卡片" />
        </div>
      </div>
    </div>
  );
}
