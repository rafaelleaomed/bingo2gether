import React from 'react';
import { Trophy } from 'lucide-react';

interface BingoScoreboardProps {
  score: { p1: number; p2: number };
  playerNames: { p1: string; p2: string };
  playerAvatars: { p1: string; p2: string };
}

const BingoScoreboard: React.FC<BingoScoreboardProps> = ({
  score,
  playerNames,
  playerAvatars,
}) => {
  const leader = score.p1 > score.p2 ? 'p1' : score.p2 > score.p1 ? 'p2' : null;

  return (
    <div className="bg-gradient-to-r from-brand-purple/5 to-brand-magenta/5 dark:from-brand-purple/10 dark:to-brand-magenta/10 border border-brand-purple/10 dark:border-brand-purple/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Trophy size={12} className="text-brand-gold" />
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Cartelas Completas
        </span>
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className={`text-center ${leader === 'p1' ? 'scale-110' : ''} transition-all`}>
          <span className="text-xl">{playerAvatars.p1}</span>
          <p className="text-2xl font-black text-brand-purple">{score.p1}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
            {playerNames.p1}
          </p>
        </div>
        <div className="text-slate-300 dark:text-slate-600 font-black text-xl">vs</div>
        <div className={`text-center ${leader === 'p2' ? 'scale-110' : ''} transition-all`}>
          <span className="text-xl">{playerAvatars.p2}</span>
          <p className="text-2xl font-black text-brand-magenta">{score.p2}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
            {playerNames.p2}
          </p>
        </div>
      </div>
      {leader && (
        <p className="text-center text-[9px] font-bold text-brand-gold mt-2 uppercase tracking-widest">
          {leader === 'p1' ? playerNames.p1 : playerNames.p2} liderando com carinho 💛
        </p>
      )}
    </div>
  );
};

export default BingoScoreboard;
