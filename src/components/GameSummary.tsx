import React from 'react';
import { GameState } from '../types';
import { formatCurrency } from '../services/gameLogic';
import { Trophy, Calendar, RefreshCcw, Medal } from 'lucide-react';

interface GameSummaryProps {
  gameState: GameState;
  onReset: () => void;
}

const GameSummary: React.FC<GameSummaryProps> = ({ gameState, onReset }) => {
  const { players, history, settings } = gameState;

  const p1Total = players.p1.totalContributed;
  const p2Total = players.p2.totalContributed;
  const total = p1Total + p2Total;
  
  const p1Penalties = history.filter(t => t.playerId === 'p1' && t.type === 'extra').length;
  const p2Penalties = history.filter(t => t.playerId === 'p2' && t.type === 'extra').length;

  const startDate = new Date(settings.startDate || settings.targetDate);
  const endDate = new Date();
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = (diffDays / 30).toFixed(1);

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-slate-950 flex items-center justify-center p-4 text-slate-800 dark:text-slate-100 overflow-hidden relative transition-colors duration-500">
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
           <div key={i} className="absolute w-3 h-3 bg-brand-gold rounded-full animate-pulse opacity-60" 
                style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}></div>
        ))}
        {[...Array(20)].map((_, i) => (
           <div key={i + 20} className="absolute w-3 h-3 bg-brand-magenta rounded-full animate-pulse opacity-60" 
                style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}></div>
        ))}
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-white dark:border-slate-800 relative z-10 animate-in zoom-in duration-500 transition-colors">
        
        <div className="text-center mb-8">
            <div className="inline-block relative">
                <Trophy className="w-24 h-24 text-brand-gold mx-auto drop-shadow-md" />
                <div className="absolute -top-2 -right-2 bg-brand-purple text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg">
                    CONCLUÍDO!
                </div>
            </div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-gold to-brand-magenta mt-4 mb-2 tracking-wider">
                BINGO!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
                Parabéns! Vocês atingiram a meta do Bingo2Gether!
            </p>
        </div>

        <div className="bg-brand-purple/5 dark:bg-brand-purple/20 rounded-3xl p-6 mb-6 text-center border border-brand-purple/10">
            <p className="text-xs text-brand-purple dark:text-brand-gold uppercase tracking-widest font-bold mb-1">Valor Total Realizado</p>
            <p className="text-4xl font-black text-brand-purple dark:text-brand-gold tracking-tight">{formatCurrency(total)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl text-center border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="text-3xl mb-1">{players.p1.avatar}</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">{players.p1.name}</div>
                <div className="text-brand-purple dark:text-brand-gold font-bold text-lg">{formatCurrency(p1Total)}</div>
                {p1Penalties > 0 && <div className="text-[10px] text-brand-magenta mt-1 font-bold">{p1Penalties} prendas</div>}
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl text-center border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="text-3xl mb-1">{players.p2.avatar}</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">{players.p2.name}</div>
                <div className="text-brand-purple dark:text-brand-gold font-bold text-lg">{formatCurrency(p2Total)}</div>
                {p2Penalties > 0 && <div className="text-[10px] text-brand-magenta mt-1 font-bold">{p2Penalties} prendas</div>}
            </div>
        </div>

        <button 
            onClick={onReset}
            className="w-full py-4 bg-brand-purple hover:opacity-90 text-white rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
        >
            <RefreshCcw size={18} /> Jogar Novamente
        </button>

      </div>
    </div>
  );
};

export default GameSummary;