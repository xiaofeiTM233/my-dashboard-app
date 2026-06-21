// app/page.tsx
"use client";

import { useState, useCallback, useRef, useMemo } from 'react';
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import Clock from "../components/Clock";
import SearchBar from "../components/SearchBar";
import GridBoard from "../components/GridBoard";
import { FloatButton } from 'antd';

export default function Home() {
  const [isGridMode, setIsGridMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cards, setCards] = useState<string[]>(['card-1']);
  const cardIdCounter = useRef(0);

  // 确保卡片数组中没有重复的 ID
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    return cards.filter(cardId => {
      if (seen.has(cardId)) {
        return false;
      }
      seen.add(cardId);
      return true;
    });
  }, [cards]);

  const toggleGridMode = useCallback(() => {
    setIsGridMode((prev) => !prev);
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleReorderCards = useCallback((reorderedCards: string[]) => {
    setCards(reorderedCards);
  }, []);

  const handleReorderCardsAsync = useCallback((callback: (prevCards: string[]) => string[]) => {
    setCards(callback);
  }, []);

  const handleAddCard = useCallback(() => {
    const newCardId = `card-${++cardIdCounter.current}`;
    setCards((prev) => [...prev, newCardId]);
    setIsModalOpen(false);
  }, []);

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
        {/* 时钟组件 - 仅在非网格模式显示 */}
        {!isGridMode && <Clock />}

        {/* 搜索栏组件 - 始终显示 */}
        <SearchBar />
      </div>

      {/* 网格模式 - 在搜索栏下面显示 */}
      {isGridMode && (
        <div className="absolute top-0 left-0 h-full w-full">
          <GridBoard
            isGridMode={isGridMode}
            onToggleMode={toggleGridMode}
            cards={uniqueCards}
            onAddCard={handleAddCard}
            onReorderCards={handleReorderCards}
            onReorderCardsAsync={handleReorderCardsAsync}
            isModalOpen={isModalOpen}
            onOpenModal={handleOpenModal}
            onCloseModal={handleCloseModal}
          />
        </div>
      )}

      {/* 右下角浮动按钮 */}
      <FloatButton.Group
        shape="circle"
        style={{ right: 24, bottom: 24 }}
        trigger="click"
      >
        <FloatButton
          icon={<AppstoreOutlined />}
          tooltip={isGridMode ? "列表视图" : "网格视图"}
          onClick={toggleGridMode}
        />
        {isGridMode && (
          <FloatButton
            icon={<PlusOutlined />}
            tooltip="添加卡片"
            onClick={handleOpenModal}
          />
        )}
      </FloatButton.Group>
    </div>
  );
}
