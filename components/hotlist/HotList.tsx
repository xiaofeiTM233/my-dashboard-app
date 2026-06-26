// components/hotlist/HotList.tsx
"use client";

import type { HotItem, HotListProps, HotSize, HotTagType } from "@/components/hotlist/types";
import { sliceBySize } from "@/components/hotlist/mockData";
import HotIndicator from "@/components/hotlist/HotIndicator";

/** 规格对应的尺寸参数 */
interface SizeTheme {
  /** 列表行高 / 卡片高度 */
  rowHeight: number;
  /** 文字字号 */
  fontSize: number;
  /** 卡片形态下的列数 */
  columns: number;
}

const SIZE_THEME: Record<HotSize, SizeTheme> = {
  "2x2": { rowHeight: 36, fontSize: 13, columns: 2 },
  "2x3": { rowHeight: 30, fontSize: 12, columns: 2 },
  "3x3": { rowHeight: 30, fontSize: 11, columns: 3 },
};

/** 标签配色 */
const TAG_STYLE: Record<HotTagType, string> = {
  hot: "text-color-red",
  boil: "text-color-orange",
  new: "text-color-blue",
  ad: "text-color-green",
  normal: "text-color-t3",
};

function formatHot(n?: number) {
  if (!n) return null;
  if (n >= 1_0000_0000) return (n / 1_0000_0000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

/** 默认点击：带 url 时新标签打开 */
function defaultOnClick(item: HotItem) {
  if (item.url) window.open(item.url, "_blank");
}

export default function HotList({
  items,
  size = "2x3",
  variant = "list",
  indicator = "rank",
  indicatorIcon,
  title,
  extra,
  onItemClick,
  className = "",
}: HotListProps) {
  const theme = SIZE_THEME[size];
  const list = sliceBySize(items, size);
  const handle = onItemClick ?? defaultOnClick;

  const header = (title || extra) && (
    <div className="flex flex-shrink-0 items-center justify-between px-[2px]">
      <span
        className="font-[family-name:var(--font-mind-demi-bold)] text-color-t1"
        style={{ fontSize: theme.fontSize + 2 }}
      >
        {title}
      </span>
      {extra}
    </div>
  );

  const content =
    variant === "card" ? (
      <CardGrid
        list={list}
        theme={theme}
        indicator={indicator}
        indicatorIcon={indicatorIcon}
        onClick={handle}
      />
    ) : (
      <ListView
        list={list}
        theme={theme}
        indicator={indicator}
        indicatorIcon={indicatorIcon}
        onClick={handle}
      />
    );

  return (
    <div
      className={["flex h-full w-full flex-col gap-[8px]", className]
        .filter(Boolean)
        .join(" ")}
    >
      {header}
      <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
    </div>
  );
}

/* ------------------------------ 列表形态 ------------------------------ */

interface ListViewProps {
  list: HotItem[];
  theme: SizeTheme;
  indicator: NonNullable<HotListProps["indicator"]>;
  indicatorIcon?: React.ReactNode;
  onClick: (item: HotItem) => void;
}

function ListView({ list, theme, indicator, indicatorIcon, onClick }: ListViewProps) {
  return (
    <ul className="flex h-full w-full flex-col">
      {list.map((item, index) => (
        <li
          key={item.id}
          className="flex cursor-pointer items-center overflow-hidden rounded-[8px] transition-colors hover:bg-color-m2 hover:bg-opacity-[0.06]"
          style={{ height: theme.rowHeight, gap: 6 }}
          onClick={() => onClick(item)}
        >
          <HotIndicator
            type={indicator}
            rank={index + 1}
            icon={indicatorIcon}
            fontSize={theme.fontSize}
          />
          <span
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-color-t1"
            style={{ fontSize: theme.fontSize }}
          >
            {item.title}
          </span>
          {item.tag && (
            <Tag text={item.tag.text} type={item.tag.type} fontSize={theme.fontSize - 2} />
          )}
          {item.hot != null && (
            <span
              className="flex-shrink-0 text-color-t3"
              style={{ fontSize: theme.fontSize - 2 }}
            >
              {formatHot(item.hot)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ 卡片形态 ------------------------------ */

function CardGrid({ list, theme, indicator, indicatorIcon, onClick }: ListViewProps) {
  return (
    <div
      className="grid h-full w-full gap-[8px]"
      style={{ gridTemplateColumns: `repeat(${theme.columns}, minmax(0, 1fr))` }}
    >
      {list.map((item, index) => (
        <div
          key={item.id}
          className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-[10px] bg-color-m2 p-[8px] transition-colors hover:bg-opacity-[0.08] bg-opacity-[0.04]"
          onClick={() => onClick(item)}
        >
          <div className="flex items-center gap-[4px]">
            <HotIndicator
              type={indicator}
              rank={index + 1}
              icon={indicatorIcon}
              fontSize={theme.fontSize}
            />
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          </div>
          <span
            className="line-clamp-2 break-words text-color-t1"
            style={{ fontSize: theme.fontSize, lineHeight: 1.35 }}
          >
            {item.title}
          </span>
          <div className="flex items-center justify-between">
            {item.tag ? (
              <Tag text={item.tag.text} type={item.tag.type} fontSize={theme.fontSize - 2} />
            ) : (
              <span />
            )}
            {item.hot != null && (
              <span
                className="text-color-t3"
                style={{ fontSize: theme.fontSize - 2 }}
              >
                {formatHot(item.hot)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ 标签 ------------------------------ */

function Tag({
  text,
  type = "normal",
  fontSize,
}: {
  text: string;
  type?: HotTagType;
  fontSize: number;
}) {
  return (
    <span
      className={["flex-shrink-0 font-[family-name:var(--font-mind-demi-bold)]", TAG_STYLE[type]].join(" ")}
      style={{ fontSize }}
    >
      {text}
    </span>
  );
}
