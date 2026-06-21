'use client';

import React from 'react';
import { Card } from 'antd';

interface GridCardProps {
  id: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

const GridCard: React.FC<GridCardProps> = ({ id, onDragStart, onDragEnd, onDragOver }) => {
  return (
    <div
      className="grid-card-wrapper"
      onDragStart={(e) => {
        e.dataTransfer.setData('cardId', id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        onDragStart(e, id);
      }}
      onDragEnd={(e) => {
        e.preventDefault();
        onDragEnd(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (onDragOver) {
          onDragOver(e);
        }
      }}
    >
      <Card
        className="grid-card-inner"
        styles={{
          body: {
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px',
          },
        }}
      >
        <span>拖拽我</span>
      </Card>
    </div>
  );
};

export default GridCard;
