// app/page.tsx
"use client";

import { useState } from "react";
import Clock from "@/components/Clock";
import SearchBar from "@/components/SearchBar";
import FixedDashboard from "@/components/FixedDashboard";
import ViewSwitcher, { type ViewMode } from "@/components/ViewSwitcher";

export default function Home() {
  const [view, setView] = useState<ViewMode>("minimal");

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
          // 卡片视图：固定布局仪表盘（搜索栏绝对定位，位置与极简视图一致）
          <div className="absolute left-0 top-0 h-full w-full">
            <FixedDashboard />
          </div>
        )}
      </div>

      {/* 右下角浮动按钮：切换视图 */}
      <ViewSwitcher view={view} onViewChange={setView} />
    </div>
  );
}
