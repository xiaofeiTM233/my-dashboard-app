// components/ViewSwitcher.tsx
"use client";

import { FloatButton } from "antd";
import { AppstoreOutlined, StopOutlined } from "@ant-design/icons";

export type ViewMode = "minimal" | "card";

interface ViewSwitcherProps {
  view: ViewMode;
  /** 切换极简 / 卡片视图 */
  onViewChange: (view: ViewMode) => void;
}

/**
 * 右下角浮动按钮：切换极简 / 卡片视图。
 */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <FloatButton.Group
      shape="square"
      style={{ right: 24, bottom: 24 }}
    >
      <FloatButton
        icon={view === "minimal" ? <AppstoreOutlined /> : <StopOutlined />}
        onClick={() => onViewChange(view === "minimal" ? "card" : "minimal")}
      />
    </FloatButton.Group>
  );
}
