// app/page.tsx
"use client";

import Clock from "../components/Clock";
import SearchBar from "../components/SearchBar";

export default function Home() {
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
        <div className="mask absolute top-0 left-0 h-full w-full transition-colors" style={{ backgroundColor: "rgba(0, 0, 0, 0.03)", backdropFilter: "blur(0px)" }}></div>
      </section>

      {/* 主要内容覆盖层 */}
      <div className="home-main absolute top-0 left-0 h-full w-full transition-transform duration-300">
        {/* 时钟组件 */}
        <Clock />

        {/* 搜索栏组件 */}
        <SearchBar />
      </div>
    </div>
  );
}
