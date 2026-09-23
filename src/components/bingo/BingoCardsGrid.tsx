import React, { useState } from 'react';
import { BingoCard } from '../../types';
import BingoCardView from './BingoCardView';
import BingoScoreboard from './BingoScoreboard';
import { Printer } from 'lucide-react';

interface BingoCardsGridProps {
  cards: BingoCard[];
  playerNames: { p1: string; p2: string };
  playerAvatars: { p1: string; p2: string };
  lastDrawnNumber?: number | null;
  onPrint?: () => void;
  competitiveScore?: { p1: number; p2: number };
}

type TabFilter = 'mine-p1' | 'mine-p2' | 'all';

const BingoCardsGrid: React.FC<BingoCardsGridProps> = ({
  cards,
  playerNames,
  playerAvatars,
  lastDrawnNumber,
  onPrint,
  competitiveScore,
}) => {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const filteredCards = cards.filter(card => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mine-p1') return card.ownerId === 'p1' || card.ownerId === 'shared';
    if (activeTab === 'mine-p2') return card.ownerId === 'p2' || card.ownerId === 'shared';
    return true;
  });

  // Sort: almost complete first
  const sortedCards = [...filteredCards].sort((a, b) => {
    const aRemaining = a.numbers.length - a.markedNumbers.length;
    const bRemaining = b.numbers.length - b.markedNumbers.length;
    if (a.isComplete && !b.isComplete) return 1; // Completed go to end
    if (!a.isComplete && b.isComplete) return -1;
    return aRemaining - bRemaining;
  });

  return (
    <div
      className="p-5 rounded-[2.5rem] transition-all duration-500"
      style={{
        background: 'var(--skin-card-bg)',
        backdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
        WebkitBackdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
        boxShadow: 'var(--skin-shadow)',
        border: 'calc(var(--skin-border-width) * 1px) solid var(--skin-border)',
      }}
    >
      {/* Scoreboard */}
      {competitiveScore && (
        <BingoScoreboard
          score={competitiveScore}
          playerNames={playerNames}
          playerAvatars={playerAvatars}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--skin-primary)' }}>
            Cartelas Interativas
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {cards.length} cartelas • {cards.filter(c => c.isComplete).length} completas
          </p>
        </div>
        {onPrint && (
          <button
            onClick={onPrint}
            className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl hover:bg-slate-200 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm transition-all active:scale-95"
          >
            <Printer size={14} /> Imprimir
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl mb-4 gap-1" style={{ backgroundColor: 'var(--skin-glass)' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'all' ? 'text-[var(--skin-bg)] shadow-md' : 'text-[var(--skin-text-main)] opacity-60 hover:opacity-100'}`}
          style={activeTab === 'all' ? { backgroundColor: 'var(--skin-primary)' } : {}}
        >
          Todas
        </button>
        <button
          onClick={() => setActiveTab('mine-p1')}
          className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'mine-p1' ? 'text-[var(--skin-bg)] shadow-md' : 'text-[var(--skin-text-main)] opacity-60 hover:opacity-100'}`}
          style={activeTab === 'mine-p1' ? { backgroundColor: 'var(--skin-primary)' } : {}}
        >
          {playerAvatars.p1} {playerNames.p1}
        </button>
        <button
          onClick={() => setActiveTab('mine-p2')}
          className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'mine-p2' ? 'text-[var(--skin-bg)] shadow-md' : 'text-[var(--skin-text-main)] opacity-60 hover:opacity-100'}`}
          style={activeTab === 'mine-p2' ? { backgroundColor: 'var(--skin-accent)' } : {}}
        >
          {playerAvatars.p2} {playerNames.p2}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
        {sortedCards.map(card => (
          <BingoCardView
            key={card.id}
            card={card}
            playerNames={playerNames}
            playerAvatars={playerAvatars}
            lastDrawnNumber={lastDrawnNumber}
            compact={activeTab !== 'all'}
          />
        ))}
      </div>
    </div>
  );
};

export default BingoCardsGrid;
