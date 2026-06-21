export interface Card {
  id: string;
  type: string;
  props: Record<string, any> | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string;
  icon?: string;
  color?: string;
}

export interface AppState {
  viewMode: 'minimal' | 'card';
  isEditMode: boolean;
  cards: Card[];
  draggedCard: Card | null;
}
