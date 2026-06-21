// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import "./card.css";
import Clock from "../components/Clock";
import SearchBar from "../components/SearchBar";
import CardGrid from "../components/CardGrid";
import ViewToggle from "../components/ViewToggle";
import { AppState, Card as CardType } from "../components/types";
import { arrayMove } from '@dnd-kit/sortable';

// 预设白板卡片数据
const DEFAULT_CARDS: CardType[] = [
  {
    id: '1',
    type: 'whiteboard',
    props: {
      title: '白板',
      content: '',
    },
    x: 1,
    y: 0,
    title: '白板',
    icon: '📝',
  },
  {
    id: '2',
    type: 'whiteboard',
    props: {
      title: '白板',
      content: '',
    },
    x: 4,
    y: 0,
    title: '白板',
    icon: '📝',
  },
  {
    id: '3',
    type: 'whiteboard',
    props: {
      title: '白板',
      content: '',
    },
    x: 7,
    y: 0,
    title: '白板',
    icon: '📝',
  },
  {
    id: '4',
    type: 'whiteboard',
    props: {
      title: '白板',
      content: '',
    },
    x: 10,
    y: 0,
    title: '白板',
    icon: '📝',
  },
];

export default function Home() {
  const [viewMode, setViewMode] = useState<AppState['viewMode']>('minimal');
  const [isEditMode, setIsEditMode] = useState<AppState['isEditMode']>(false);
  const [cards, setCards] = useState<CardType[]>([]);

  // 从 localStorage 加载卡片数据
  useEffect(() => {
    const savedCards = localStorage.getItem('wetab-cards');
    if (savedCards) {
      try {
        const parsed: CardType[] = JSON.parse(savedCards);
        // 数据清洗：确保每张卡片的 props 不为 null/undefined，并补全必要字段
        const sanitized = parsed.map((card) => ({
          ...card,
          props: card.props ?? {},
        }));
        setCards(sanitized);
      } catch (error) {
        console.error('Failed to parse saved cards:', error);
        setCards(DEFAULT_CARDS);
      }
    } else {
      setCards(DEFAULT_CARDS);
    }
  }, []);

  // 保存卡片数据到 localStorage
  useEffect(() => {
    localStorage.setItem('wetab-cards', JSON.stringify(cards));
  }, [cards]);

  const handleViewModeChange = (mode: 'minimal' | 'card') => {
    setViewMode(mode);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleCardDelete = (id: string) => {
    setCards((prevCards) => prevCards.filter((card) => card.id !== id));
  };

  const handleCardDrop = (card: CardType, x: number, y: number) => {
    // 根据 x, y 坐标重新排序卡片
    setCards((prevCards) => {
      // 找到被拖拽卡片的当前位置索引
      const fromIndex = prevCards.findIndex((c) => c.id === card.id);
      
      // 计算新位置在数组中的索引
      const CARD_COLS = 15;
      const toIndex = y * CARD_COLS + x;
      
      // 如果位置相同，不做任何操作
      if (fromIndex === toIndex) {
        return prevCards;
      }
      
      // 移动卡片到新位置
      const newCards = [...prevCards];
      const [movedCard] = newCards.splice(fromIndex, 1);
      newCards.splice(toIndex, 0, movedCard);
      
      return newCards;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCards((prevCards) => {
      const oldIndex = prevCards.findIndex((c) => c.id === active.id);
      const newIndex = prevCards.findIndex((c) => c.id === over.id);
      const movedCards = arrayMove(prevCards, oldIndex, newIndex);

      // 更新所有卡片的 x, y 坐标以匹配新数组顺序
      return movedCards.map((card, index) => {
        const x = index % 15;
        const y = Math.floor(index / 15);
        return { ...card, x, y };
      });
    });
  };

  const handleAddCard = () => {
    const newCard: CardType = {
      id: `card-${Date.now()}`,
      type: 'whiteboard',
      props: {
        title: '白板',
        content: '',
      },
      x: 0,
      y: 0,
      title: '白板',
      icon: '📝',
    };
    setCards((prevCards) => [...prevCards, newCard]);
  };

  const handleSave = () => {
    // 保存逻辑已在 useEffect 中处理
  };

  const handleCancel = () => {
    // 重新加载保存的数据
    const savedCards = localStorage.getItem('wetab-cards');
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (error) {
        console.error('Failed to reload saved cards:', error);
      }
    }
    setIsEditMode(false);
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
        <div className="mask absolute top-0 left-0 h-full w-full transition-colors" style={{ backgroundColor: "rgba(0, 0, 0, 0.03)", backdropFilter: "blur(0px)" }}></div>
      </section>

      {/* 主要内容覆盖层 */}
      <div className="home-main absolute top-0 left-0 h-full w-full">
        {viewMode === 'minimal' ? (
          <>
            {/* 极简视图: 显示时钟和搜索栏 */}
            <Clock />
            <SearchBar />
          </>
        ) : (
          <>
            {/* 卡片视图: 显示搜索栏和卡片网格 */}
            <SearchBar />
            <CardGrid
              cards={cards}
              isEditMode={isEditMode}
              onCardDelete={handleCardDelete}
              onCardDrop={handleCardDrop}
              onDragEnd={handleDragEnd}
            />
          </>
        )}

        {/* 视图切换 + 编辑模式按钮组 */}
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          onSave={handleSave}
          onCancel={handleCancel}
          onAddCard={handleAddCard}
        />
      </div>
    </div>
  );
}
