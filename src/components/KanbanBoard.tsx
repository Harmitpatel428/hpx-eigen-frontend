import React, { ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';

export interface KanbanCard {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  health?: string;
  stage: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  count: number;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  onCardMove: (cardId: string, fromStage: string, toStage: string) => void;
  onCardClick?: (card: KanbanCard) => void;
  renderCard?: (card: KanbanCard) => ReactNode;
}

export function KanbanBoard({ columns, cards, onCardMove, onCardClick, renderCard }: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = React.useState<KanbanCard | null>(null);
  const [dragSource, setDragSource] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, card: KanbanCard) => {
    setDraggedCard(card);
    setDragSource(card.stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    if (draggedCard && dragSource && dragSource !== toStage) {
      onCardMove(draggedCard.id, dragSource, toStage);
    }
    setDraggedCard(null);
    setDragSource(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragSource(null);
  };

  const getCardsForStage = (stage: string) => cards.filter((card) => card.stage === stage);

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnCards = getCardsForStage(column.id);
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">
                {column.title} <span className="text-gray-400">({column.count})</span>
              </h3>
            </div>

            {/* Cards container */}
            <div className="space-y-3 min-h-96 bg-[#16213e]/30 rounded-lg p-3">
              {columnCards.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                  No opportunities
                </div>
              ) : (
                columnCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onCardClick?.(card)}
                    className={`bg-[#1a1a2e] border border-[#16213e] rounded-lg p-4 cursor-grab active:cursor-grabbing transition-all ${
                      draggedCard?.id === card.id ? 'opacity-50' : ''
                    } hover:border-blue-500/50`}
                  >
                    {renderCard ? (
                      renderCard(card)
                    ) : (
                      <>
                        <div className="flex items-start gap-2 mb-2">
                          <GripHorizontal size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{card.title}</p>
                            {card.subtitle && <p className="text-xs text-gray-400 truncate">{card.subtitle}</p>}
                          </div>
                        </div>
                        {card.value && (
                          <p className="text-sm font-semibold text-blue-400 mb-2">{card.value}</p>
                        )}
                        {card.health && (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                card.health === 'On-track'
                                  ? 'bg-green-500'
                                  : card.health === 'At-risk'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                            />
                            <span className="text-xs text-gray-400">{card.health}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
