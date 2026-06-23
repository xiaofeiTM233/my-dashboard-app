// components/ViewSwitcher.tsx
"use client";

import { FloatButton } from "antd";
import { AppstoreOutlined, StopOutlined, EditOutlined, CheckOutlined } from "@ant-design/icons";

export type ViewMode = "minimal" | "card";

interface ViewSwitcherProps {
  view: ViewMode;
  editing: boolean;
  /** 切换极简 / 卡片视图 */
  onViewChange: (view: ViewMode) => void;
  /** 切换编辑模式（仅在卡片视图下有效） */
  onEditToggle: () => void;
}

/**
 * 右下角浮动按钮组（方形）。
 * - 极简视图：展示「切换到卡片视图」按钮。
 * - 卡片视图：展示「编辑/完成」与「切换到极简视图」按钮。
 */
export default function ViewSwitcher({
  view,
  editing,
  onViewChange,
  onEditToggle,
}: ViewSwitcherProps) {
  return (
    <FloatButton.Group
      shape="square"
      trigger="click"
      placement="leftTop"
      style={{ insetInlineEnd: 24, insetBlockEnd: 24 }}
      icon={<AppstoreOutlined />}
    >
      <FloatButton
        shape="square"
        icon={view === "minimal" ? <AppstoreOutlined /> : <StopOutlined />}
        onClick={() =>
          onViewChange(view === "minimal" ? "card" : "minimal")
        }
      />
      {/* 编辑按钮仅在卡片视图下显示：极简视图没有网格可编辑 */}
      {view === "card" && (
        <FloatButton
          shape="square"
          icon={editing ? <CheckOutlined /> : <EditOutlined />}
          onClick={onEditToggle}
        />
      )}
    </FloatButton.Group>
  );
}


