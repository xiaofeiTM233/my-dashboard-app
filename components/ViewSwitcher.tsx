// components/ViewSwitcher.tsx
"use client";

import { FloatButton } from "antd";
import { AppstoreOutlined, StopOutlined, EditOutlined, CheckOutlined, PlusOutlined } from "@ant-design/icons";

export type ViewMode = "minimal" | "card";

interface ViewSwitcherProps {
  view: ViewMode;
  editing: boolean;
  /** 切换极简 / 卡片视图 */
  onViewChange: (view: ViewMode) => void;
  /** 切换编辑模式（仅在卡片视图下有效） */
  onEditToggle: () => void;
  /** 打开卡片编辑器 */
  onOpenCardEditor: () => void;
}

/**
 * 右下角浮动按钮组（方形）。
 * - 默认全部展开，不折叠。
 * - 卡片视图：上方「新增卡片」，然后「编辑/完成」，最下方「切换到极简视图」。
 * - 极简视图：仅「切换到卡片视图」。
 */
export default function ViewSwitcher({
  view,
  editing,
  onViewChange,
  onEditToggle,
  onOpenCardEditor,
}: ViewSwitcherProps) {
  return (
    <FloatButton.Group
      shape="square"
      style={{ right: 24, bottom: 24 }}
    >
      {/* 新增卡片按钮在编辑按钮上方，仅在编辑模式下显示 */}
      {editing && (
        <FloatButton
          type="primary"
          icon={<PlusOutlined />}
          onClick={onOpenCardEditor}
        />
      )}
      {/* 编辑按钮在上方，仅在卡片视图下显示 */}
      {view === "card" && (
        <FloatButton
          type={editing ? "primary" : "default"}
          icon={editing ? <CheckOutlined /> : <EditOutlined />}
          onClick={onEditToggle}
        />
      )}
      {/* 切换模式按钮在最下方 */}
      <FloatButton
        icon={view === "minimal" ? <AppstoreOutlined /> : <StopOutlined />}
        onClick={() => onViewChange(view === "minimal" ? "card" : "minimal")}
      />
    </FloatButton.Group>
  );
}


