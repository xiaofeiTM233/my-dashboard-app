"use client";

import React, { useState } from 'react';
import { DndContext, closestCorners, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card';
import { Card as CardType } from './types';

interface CardGridProps {
  cards: CardType[];
  isEditMode: boolean;
  onCardDelete: (id: string) => void;
  onCardDrop: (card: CardType, x: number, y: number) => void;
  onDragEnd: (e: DragEndEvent) => void;
}

const CARD_COLS = 15;
const CARD_ROWS = 5;
const CARD_GAP = 8;

const CardGrid: React.FC<CardGridProps> = ({
  cards,
  isEditMode,
  onCardDelete,
  onCardDrop,
  onDragEnd,
}) => {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const handleDragStart = (event: any) => {
    const card = event.active.data.current;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    onDragEnd(event);
  };

  const handleCardDelete = (id: string) => {
    onCardDelete(id);
  };

  // 渲染卡片
  const renderCards = () => {
    return cards.map((card) => (
      <Card
        key={card.id}
        card={{ ...card, props: card.props || {} }}
        isEditMode={isEditMode}
        onDelete={handleCardDelete}
      />
    ));
  };

  return (
    <div
      className="card-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${CARD_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${CARD_ROWS}, 1fr)`,
        gap: `${CARD_GAP}px`,
        marginTop: '28.5vh',
      }}
    >
      {isEditMode ? (
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            {renderCards()}
          </SortableContext>
          <DragOverlay>
            {activeCard && (
              <Card
                card={activeCard}
                isEditMode={true}
                onDelete={handleCardDelete}
              />
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        renderCards()
      )}
    </div>
  );
};

export default CardGrid;
