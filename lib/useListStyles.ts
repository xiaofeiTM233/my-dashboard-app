"use client";

import { useLayoutEffect } from "react";

const STYLE_ID = "dx-list-styles";

const CSS = `
/* 滚动条 */
.dx-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) transparent;
}
.dx-scroll::-webkit-scrollbar {
  width: 8px;
}
.dx-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.dx-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.28);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.dx-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
  background-clip: content-box;
}
.dx-scroll-x-none {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.dx-scroll-x-none::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* 头尾栏 */
.dx-head {
  padding: 10px 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}
.dx-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}
.dx-foot-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* 热榜 Tab */
.dx-tab-sep {
  width: 1px;
  height: 10px;
  flex-shrink: 0;
  margin: 0 2px;
  background: rgba(0, 0, 0, 0.15);
}
.dx-tab {
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.65);
  font-weight: 400;
  transition: color 0.15s;
}
.dx-tab.is-active {
  color: #4A7AFF;
  font-weight: 600;
}

/* 热榜条目 */
.dx-hot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
}
.dx-rank {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.45);
}
.dx-hot-title {
  flex: 1;
  min-width: 0;
  display: block;
}
.dx-hot-title .ant-typography {
  margin-bottom: 0;
  font-size: 16px;
}
.dx-hot-value {
  font-size: 14px;
  flex-shrink: 0;
}

/* Todo 分组 */
.dx-group-btn {
  width: 100%;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px 4px;
  text-align: left;
  font: inherit;
  color: inherit;
}
.dx-caret {
  display: inline-block;
  width: 0;
  height: 0;
  flex-shrink: 0;
  border-left: 5px solid rgba(0, 0, 0, 0.45);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.15s;
}
.dx-caret.is-open {
  transform: rotate(90deg);
}
.dx-group-title {
  font-size: 14px;
  font-weight: 600;
}
.dx-group-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
.dx-group-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

/* Todo 行 */
.dx-list-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 14px 6px 10px;
}
.dx-list-row.is-select-mode {
  cursor: pointer;
}
.dx-list-row.is-selected {
  background: rgba(74, 122, 255, 0.08);
}
.dx-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1.5px solid var(--dx-check-color, #c9c9ce);
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  transition: background-color 0.15s;
}
.dx-check:disabled {
  cursor: wait;
}
.dx-check.is-checked {
  background: var(--dx-check-color, #c9c9ce);
}
.dx-task-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 20px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.dx-task-title.is-done {
  color: rgba(0, 0, 0, 0.35);
  text-decoration: line-through;
}
.dx-task-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  max-width: 52%;
  overflow: hidden;
}
.dx-tag {
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.dx-meta-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Todo 详情浮层 */
.dx-popup {
  position: fixed;
  width: 360px;
  max-height: min(70vh, 520px);
  overflow-y: auto;
  z-index: 1000;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  padding: 14px 16px;
  box-sizing: border-box;
}
.dx-popup-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.dx-popup-body {
  min-width: 0;
  flex: 1;
}
.dx-popup-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  word-break: break-word;
}
.dx-popup-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.dx-popup-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dx-popup-content {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
.dx-check-lg {
  width: 18px;
  height: 18px;
  margin-top: 3px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1.5px solid var(--dx-check-color, #c9c9ce);
  background: transparent;
  cursor: pointer;
  padding: 0;
}

/* 占位骨架区 */
.dx-pad-sm { padding: 12px; }
.dx-pad-md { padding: 16px; }
.dx-pad-lg { padding: 24px; }
.dx-list-body { padding-top: 4px; }

/* 日历文字色 */
.cal-primary { color: rgba(0, 0, 0, 0.88); }
.cal-secondary { color: rgba(0, 0, 0, 0.65); }
.cal-muted { color: rgba(0, 0, 0, 0.4); }
.cal-faint { color: rgba(0, 0, 0, 0.25); }
.cal-festival { color: #4A7AFF; }
.cal-today { color: #ff4d4f; }
.cal-today-box {
  border: 1px solid #4A7AFF;
  border-radius: 8px;
}
.cal-flash {
  animation: cal-flash-bg 0.4s ease-in-out 2;
}
@keyframes cal-flash-bg {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(74, 122, 255, 0.4);
  }
}
.cal-suit { color: #1f9d4a; }
.cal-avoid { color: #e0484a; }
.cal-chip {
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(74, 122, 255, 0.12);
  color: #4A7AFF;
}
.cal-tag-yi {
  border-radius: 4px;
  padding: 2px 8px;
  margin-right: 8px;
  font-weight: 500;
  background: rgba(52, 199, 89, 0.14);
  color: #1f9d4a;
}
.cal-tag-ji {
  border-radius: 4px;
  padding: 2px 8px;
  margin-right: 8px;
  font-weight: 500;
  background: rgba(255, 77, 79, 0.12);
  color: #e0484a;
}
.cal-divider {
  border-right: 1px solid rgba(255, 255, 255, 0.4);
}
.cal-bar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}
.cal-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) transparent;
}
.cal-scroll::-webkit-scrollbar {
  width: 8px;
}
.cal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.cal-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.28);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.cal-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
  background-clip: content-box;
}
`;

function injectOnce() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.textContent = CSS;
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-dx", "list");
  style.textContent = CSS;
  document.head.insertBefore(style, document.head.firstChild);
}

// 模块一加载就注入（仅客户端包）
injectOnce();

/**
 * 仪表盘列表类组件共用样式（CSS-in-JS，单次注入）。
 * 静态布局/字号用 class，动态颜色仍走 inline style。
 */
export function useListStyles() {
  useLayoutEffect(() => {
    injectOnce();
  }, []);
}
