// components/cards/CardEditor.tsx
"use client";

import { Drawer, Card, List, Empty } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import type { WidgetPreset } from "@/components/grid/grid";
import { hotListPresets } from "@/components/cards/HotListCard";
import { blankCardPreset } from "@/components/cards/BlankCard";

/**
 * 卡片编辑器组件
 * 使用 antd Drawer + Card + List 实现侧边抽屉
 */
export default function CardEditor({
  open,
  onClose,
  onAddCard,
}: {
  open: boolean;
  onClose: () => void;
  onAddCard: (preset: WidgetPreset) => void;
}) {
  // 热搜卡片类型
  const hotListTypes = [
    { id: "hot-2x3-list-rank", name: "热搜 · 2x3 列表", icon: "🔥" },
    { id: "hot-2x2-card-dot", name: "热搜 · 2x2 卡片", icon: "🔥" },
    { id: "hot-3x3-list-rank", name: "热搜 · 3x3 列表", icon: "🔥" },
  ];

  const hotListData = hotListTypes
    .map((type) => ({ ...type, preset: hotListPresets.find((p) => p && p.id === type.id) }))
    .filter((item) => item.preset);

  const blankData = blankCardPreset
    ? [{ id: "blank-1x1", name: "空白卡片", icon: "⬜", preset: blankCardPreset }]
    : [];

  const renderCard = (item: { id: string; name: string; icon: string; preset?: WidgetPreset }) => (
    <Card
      hoverable
      onClick={() => item.preset && onAddCard(item.preset)}
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ background: "rgb(var(--color-b4))" }}
        >
          {item.icon}
        </div>
        <span className="text-sm font-medium" style={{ color: "rgb(var(--color-t2))" }}>
          {item.name}
        </span>
      </div>
    </Card>
  );

  return (
    <Drawer
      title="添加卡片"
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
    >
      <div className="flex flex-col gap-8">
        {/* 热搜卡片 */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-color-t2">热搜卡片</h4>
          {hotListData.length > 0 ? (
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={hotListData}
              renderItem={(item) => <List.Item>{renderCard(item)}</List.Item>}
            />
          ) : (
            <Empty description="暂无热搜卡片" />
          )}
        </section>

        {/* 空白卡片 */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-color-t2">空白卡片</h4>
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={blankData}
            renderItem={(item) => <List.Item>{renderCard(item)}</List.Item>}
          />
        </section>
      </div>
    </Drawer>
  );
}
