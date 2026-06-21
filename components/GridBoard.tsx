'use client';

import React, { useState, useCallback } from 'react';
import { FloatButton, Modal, Space } from 'antd';
import { AppstoreOutlined, LayoutOutlined, PlusOutlined } from '@ant-design/icons';
import GridCard from './GridCard';
import './GridBoard.css';

interface GridBoardProps {
  isGridMode: boolean;
  onToggleMode: () => void;
  cards: string[];
  onAddCard: () => void;
  onReorderCards: (cards: string[]) => void;
  isModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onReorderCardsAsync: (callback: (prevCards: string[]) => string[]) => void;
}

const GridBoard: React.FC<GridBoardProps> = ({
  isGridMode,
  onToggleMode,
  cards,
  onAddCard,
  onReorderCards,
  onReorderCardsAsync,
  isModalOpen,
  onOpenModal,
  onCloseModal
}) => {

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('cardId', id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedCardId = e.dataTransfer.getData('cardId');
    const targetIndex = (e.currentTarget as HTMLElement).dataset.dropIndex;
    
    if (droppedCardId && targetIndex !== undefined) {
      const targetIndexNum = parseInt(targetIndex, 10);
      
      onReorderCardsAsync((prevCards: string[]) => {
        const newCards = [...prevCards];
        const draggedIndex = newCards.indexOf(droppedCardId);
        
        if (draggedIndex !== -1) {
          // 移动卡片到新位置
          const [removed] = newCards.splice(draggedIndex, 1);
          newCards.splice(targetIndexNum, 0, removed);
        }
        return newCards;
      });
    }
  }, [onReorderCards]);

  return (
    <>
      <div className="grid-board-container" style={{ marginTop: '28.5vh', flex: 1 }}>
        {isGridMode ? (
          <div className="grid-board">
            {cards.map((cardId, index) => (
              <div
                key={cardId}
                data-drop-index={index}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="grid-cell"
              >
                <GridCard
                  id={cardId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <h2>列表视图</h2>
            <p>点击右下角按钮切换到网格视图</p>
          </div>
        )}
      </div>


      <Modal
        title="添加新卡片"
        open={isModalOpen}
        onOk={onAddCard}
        onCancel={onCloseModal}
        okText="确认"
        cancelText="取消"
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <p>要添加一个新的1x1空白卡片吗？</p>
        </Space>
      </Modal>
    </>
  );
};

export default GridBoard;
