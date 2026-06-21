"use client";

import React from 'react';
import { Card } from './types';
import WhiteboardCard from './whiteboard-card';

interface DynamicCardLoaderProps {
  card: Card;
}

// 占位卡片组件
const PlaceholderCard: React.FC<any> = ({ title, icon, color }) => {
  return (
    <div className="card-content placeholder-card" style={{ backgroundColor: color }}>
      {icon && <div className="card-icon">{icon}</div>}
      <div className="card-title">{title || '未知卡片类型'}</div>
      <div className="card-description">请检查组件文件是否存在</div>
    </div>
  );
};

// 静态组件映射表（替代动态 import，兼容 Turbopack）
const componentMap: Record<string, React.ComponentType<any>> = {
  'whiteboard': WhiteboardCard,
};

const DynamicCardLoader: React.FC<DynamicCardLoaderProps> = ({ card }) => {
  const Component = componentMap[card.type];

  if (!Component || typeof Component !== 'function') {
    return <PlaceholderCard {...(card.props || {})} title={card.title || '未知卡片类型'} icon={card.icon} color={card.color} />;
  }

  return <Component {...(card.props || {})} />;
};

export default DynamicCardLoader;
