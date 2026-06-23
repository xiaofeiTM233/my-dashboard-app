// app/page.tsx
"use client";

import { useState } from "react";
import Clock from "@/components/Clock";
import SearchBar from "@/components/SearchBar";
import GridDashboard from "@/components/grid/GridDashboard";
import ViewSwitcher, { type ViewMode } from "@/components/ViewSwitcher";

export default function Home() {
  const [view, setView] = useState<ViewMode>("minimal");
  const [editing, setEditing] = useState(false);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    // 离开卡片视图时退出编辑模式
    if (next === "minimal") setEditing(false);
  };

  const handleEditToggle = () => {
    setEditing((v) => !v);
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
      />
    </div>
  );
}
