"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DynamicCardLoader from './DynamicCardLoader';
import { Card as CardType } from './types';

interface CardProps {
  card: CardType;
  isEditMode: boolean;
  onDelete?: (id: string) => void;
}

const Card: React.FC<CardProps> = ({ card, isEditMode, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: card,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isEditMode ? 'edit-mode' : ''}`}
      {...attributes}
      {...(isEditMode ? listeners : {})}
    >
      <DynamicCardLoader card={card} />
      {isEditMode && (
        <button
          className="card-delete-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (onDelete) onDelete(card.id);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Card;
