import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BingoCard, BingoReward } from '../../types';
import { Trophy, Sparkles, Gift, RefreshCw, PenTool } from 'lucide-react';

interface BingoCelebrationProps {
  card: BingoCard;
  winnerName: string;
  winnerAvatar: string;
  suggestedReward?: string;
  onClose: () => void;
  onRerollReward: () => void;
  onCustomReward: (reward: string) => void;
}

const BingoCelebration: React.FC<BingoCelebrationProps> = ({
  card,
  winnerName,
  winnerAvatar,
  suggestedReward,
  onClose,
  onRerollReward,
  onCustomReward,
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const defaultRewards = [
    "Escolhe o restaurante da semana! 🍽️",
    "Não lava louça por 7 dias! 🍽️✨",
    "Ganha massagem de 30 min! 💆",
    "Escolhe o filme do mês! 🎬",
    "Dia de folga de tarefas! 🛋️",
    "Café da manhã na cama! ☕🥞",
    "Escolhe a playlist da semana! 🎵",
  ];

  const reward = suggestedReward || defaultRewards[Math.floor(Math.random() * defaultRewards.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.3, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="rounded-[3rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
        style={{ background: 'var(--skin-card-bg)', borderColor: 'var(--skin-primary)', borderWidth: '2px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-2 animate-pulse" style={{ background: 'linear-gradient(90deg, var(--skin-primary), var(--skin-accent), var(--skin-primary))', backgroundSize: '200% 100%' }} />

        {/* Confetti background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, x: Math.random() * 300, opacity: 1 }}
              animate={{
                y: 500,
                x: Math.random() * 300,
                rotate: Math.random() * 720,
                opacity: 0,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#7c3aed', '#ec4899', '#e6c26e', '#f97316', '#10b981', '#3b82f6'][i % 6],
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          {/* Winner */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-7xl mb-2"
          >
            {winnerAvatar}
          </motion.div>

          <h2 className="text-5xl font-black text-transparent bg-clip-text tracking-tighter mb-1" style={{ backgroundImage: 'linear-gradient(to bottom, var(--skin-primary), var(--skin-accent))' }}>
            BINGO!
          </h2>
          <p className="text-sm font-black text-[var(--skin-text-main)] uppercase tracking-widest mb-1 opacity-70">
            Cartela #{card.id} completa!
          </p>
          <p className="text-lg font-black mb-6" style={{ color: 'var(--skin-primary)' }}>
            {winnerName} venceu! 🏆
          </p>

          {/* Reward */}
          {!customMode ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'calc(var(--skin-primary) * 0.1)', borderColor: 'var(--skin-primary)' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Prêmio Sugerido</p>
                </div>
                <p className="text-lg font-black" style={{ color: 'var(--skin-primary)' }}>
                  {reward}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onRerollReward}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <RefreshCw size={12} /> Sortear outro
                </button>
                <button
                  onClick={() => setCustomMode(true)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <PenTool size={12} /> Criar meu
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Ex: Viagem de fim de semana!"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 font-bold text-sm focus:border-brand-purple outline-none"
              />
              <button
                onClick={() => { if (customText.trim()) onCustomReward(customText.trim()); }}
                disabled={!customText.trim()}
                className="w-full py-4 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--skin-primary)' }}
              >
                Salvar Prêmio
              </button>
              <button
                onClick={() => setCustomMode(false)}
                className="text-[10px] font-bold text-[var(--skin-text-main)] uppercase tracking-widest opacity-60"
              >
                Voltar
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-4 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--skin-primary), var(--skin-accent))' }}
          >
            <Sparkles size={16} /> Comemorar!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BingoCelebration;
