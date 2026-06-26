// components/hotlist/HotIndicator.tsx
import type { HotIndicator } from "@/components/hotlist/types";

interface HotIndicatorProps {
  /** 标识类型 */
  type: HotIndicator;
  /** 当 type="rank" 时的排名序号（从 1 开始） */
  rank?: number;
  /** 当 type="icon" 时展示的自定义图标 */
  icon?: React.ReactNode;
  /** 字号尺寸，跟随规格自适应 */
  fontSize?: number;
}

/**
 * 条目前置标识：
 * - rank : 序号排名，前三名使用红/橙/黄高亮，其余灰显
 * - dot  : 单纯圆点
 * - icon : 调用方传入的自定义图标
 * - none : 不渲染
 */
export default function HotIndicator({
  type,
  rank,
  icon,
  fontSize = 14,
}: HotIndicatorProps) {
  if (type === "none") return null;

  if (type === "icon") {
    return (
      <span
        className="flex flex-shrink-0 items-center justify-center text-color-t3"
        style={{ width: fontSize + 6 }}
      >
        {icon}
      </span>
    );
  }

  if (type === "dot") {
    return (
      <span
        className="flex flex-shrink-0 items-center"
        style={{ width: fontSize + 6 }}
      >
        <span
          className="rounded-full bg-color-t3 bg-opacity-60"
          style={{ width: 5, height: 5 }}
        />
      </span>
    );
  }

  // rank
  const top = rank === 1 || rank === 2 || rank === 3;
  // 前三名配色：红 / 橙 / 黄，其余使用次级文字色
  const colorClass =
    rank === 1
      ? "text-color-red"
      : rank === 2
        ? "text-color-orange"
        : rank === 3
          ? "text-color-yellow"
          : "text-color-t3";

  return (
    <span
      className={[
        "flex flex-shrink-0 items-center justify-center font-[family-name:var(--font-mind-demi-bold)]",
        top ? "opacity-100" : "opacity-70",
        colorClass,
      ].join(" ")}
      style={{ width: fontSize + 6, fontSize }}
    >
      {rank}
    </span>
  );
}
