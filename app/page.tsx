// app/page.tsx
"use client";

import { useState } from "react";
import Clock from "@/components/Clock";
import SearchBar from "@/components/SearchBar";
import GridDashboard from "@/components/grid/GridDashboard";
import ViewSwitcher, { type ViewMode } from "@/components/ViewSwitcher";
import CardEditor from "@/components/cards/CardEditor";
import type { WidgetPreset, WidgetInstance } from "@/components/grid/grid";
import { useLayoutStore } from "@/components/grid/grid";

export default function Home() {
  const [view, setView] = useState<ViewMode>("minimal");
  const [editing, setEditing] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const { instances, setInstances, saveLayout } = useLayoutStore();

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    // 离开卡片视图时退出编辑模式
    if (next === "minimal") setEditing(false);
  };

  const handleEditToggle = () => {
    setEditing((v) => !v);
  };

  const handleOpenCardEditor = () => {
    setShowCardEditor(true);
  };

  const handleCloseCardEditor = () => {
    setShowCardEditor(false);
  };

  const handleAddCard = (preset: WidgetPreset) => {
    console.log('handleAddCard called with preset:', preset);
    if (!preset || !preset.position) {
      console.log('Invalid preset or position');
      return;
    }

    // 生成唯一ID
    const newInstanceId = `${preset.id}-${Date.now()}`;

    // 创建新实例，确保 position 被正确复制
    const newInstance: WidgetInstance = {
      ...preset,
      instanceId: newInstanceId,
    };

    console.log('Creating new instance:', newInstance);

    // 添加到实例列表
    setInstances((prev) => {
      const next = [...prev, newInstance];
      console.log('Updated instances:', next);
      saveLayout(next);
      return next;
    });

    // 关闭编辑器
    console.log('Closing card editor');
    handleCloseCardEditor();
  };

  return (
    <div className="icon-s icon-home-small home h-full w-full">
      {/* 视频背景 */}
      <section className="home-wallpaper h-full w-full">
        <video
          className="h-full w-full object-cover"
          src="https://eo.hitfun.top/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div
          className="mask absolute top-0 left-0 h-full w-full transition-colors"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            backdropFilter: "blur(0px)",
          }}
        />
      </section>

      {/* 主要内容覆盖层 */}
      <div className="home-main absolute top-0 left-0 h-full w-full transition-transform duration-300">
        {view === "minimal" ? (
          // 极简视图：时钟 + 搜索栏
          <>
            <Clock />
            <SearchBar />
          </>
        ) : (
          // 卡片视图：隐藏时钟，顶部搜索栏 + 卡片网格（内容起始 mt-[28.5vh]）
          <div className="h-full w-full">
            <SearchBar />
            {/* 卡片网格内容区域，自 mt-[28.5vh] 开始 */}
            <div className="absolute left-0 mt-[28.5vh] h-[calc(100%-28.5vh)] w-full">
              <GridDashboard editing={editing} />
            </div>
          </div>
        )}
      </div>

      {/* 右下角浮动按钮组（方形）：切换视图 + 编辑模式 */}
      <ViewSwitcher
        view={view}
        editing={editing}
        onViewChange={handleViewChange}
        onEditToggle={handleEditToggle}
        onOpenCardEditor={handleOpenCardEditor}
      />

      {/* 卡片编辑器 */}
      <CardEditor
        open={showCardEditor}
        onClose={handleCloseCardEditor}
        onAddCard={handleAddCard}
      />
    </div>
  );
}
