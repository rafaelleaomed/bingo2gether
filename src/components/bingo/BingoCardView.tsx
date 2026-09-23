import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BingoCard } from '../../types';
import { Trophy, Diamond, Plane, Car, Heart } from 'lucide-react';
import { useSkinStore } from '../../store/skinStore';

interface BingoCardViewProps {
  card: BingoCard;
  playerNames: { p1: string; p2: string };
  playerAvatars: { p1: string; p2: string };
  lastDrawnNumber?: number | null;
  compact?: boolean;
}

const BingoCardView: React.FC<BingoCardViewProps> = ({
  card,
  playerNames,
  playerAvatars,
  lastDrawnNumber,
  compact = false,
}) => {
  const remaining = (card.numbers?.length || 0) - (card.markedNumbers?.length || 0);
  const isAlmostComplete = remaining <= 3 && remaining > 0;
  const ownerName = card.ownerId === 'shared' ? 'Compartilhada' :
    card.ownerId === 'p1' ? playerNames.p1 : playerNames.p2;
  const ownerAvatar = card.ownerId === 'shared' ? '🤝' :
    card.ownerId === 'p1' ? playerAvatars.p1 : playerAvatars.p2;

  // Hooks
  const theme = useSkinStore(state => state.theme);

  // Customizações visuais por tema
  const getThemeStamp = () => {
    switch (theme) {
      case 'matrimoney': return <Diamond size={compact ? 12 : 16} className="fill-current" />;
      case 'viagem': return <Plane size={compact ? 12 : 16} className="fill-current" />;
      case 'carro': return <Car size={compact ? 12 : 16} className="fill-current" />;
      default: return <Heart size={compact ? 12 : 16} className="fill-current" />;
    }
  };

  // 3D Interaction Hooks
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // Background map matching immersive nanobanana premium backgrounds
  const getBackgroundImage = () => {
    switch (theme) {
      case 'matrimoney': return 'url("/backgrounds/bg_matrimoney_new.png")';
      case 'viagem': return 'url("/backgrounds/bg_viagem_new.png")';
      case 'carro': return 'url("/backgrounds/bg_carro_new.png")';
      default: return 'none';
    }
  };

  const calculateRotation = (clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Limits the rotation to subtle amounts
    setRotateX(((y - centerY) / centerY) * -8);
    setRotateY(((x - centerX) / centerX) * 8);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    calculateRotation(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      calculateRotation(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setScale(1);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setScale(1.02);
  };

  const handleTouchStart = () => {
    setIsHovered(true);
    setScale(1.02);
  };

  return (
    <div
      className={`relative rounded-[2rem] transition-all duration-300 ${isAlmostComplete ? 'ring-2 ring-brand-gold animate-pulse-glow' : ''
        } ${card.isComplete ? 'ring-2 ring-green-500' : ''}`}
      style={{ perspective: 1200 }}
    >
      {/* Complete overlay */}
      {card.isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] overflow-hidden"
          style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--skin-glass)' }}
        >
          <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--skin-primary), var(--skin-accent))' }} />
          <div className="font-black text-white text-2xl -rotate-6 py-4 px-10 shadow-2xl border-4 border-white flex flex-col items-center justify-center gap-1 backdrop-blur-md relative z-20" style={{ background: 'linear-gradient(135deg, var(--skin-primary), var(--skin-accent))', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-3"><Trophy size={28} className="drop-shadow-md" /> <span className="tracking-widest drop-shadow-md">BINGO!</span></div>
            <span className="text-[10px] uppercase font-bold text-white/90 drop-shadow-md">{ownerName} venceu</span>
          </div>
        </motion.div>
      )}

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleMouseLeave}
        animate={{ rotateX, rotateY, scale }}
        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
        className={`border ${compact ? 'p-3' : 'p-4'} rounded-[2rem] shadow-2xl relative overflow-hidden`}
        style={{
          background: 'var(--skin-card-bg)',
          backgroundImage: getBackgroundImage(),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'var(--skin-primary)',
          transformStyle: 'preserve-3d',
          boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.1)'
        }}
      >
        {/* Glow effect when hovered, anchoring to skin primary color */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 50px 10px var(--skin-primary), 0 0 20px 2px var(--skin-primary)`,
            borderRadius: 'inherit'
          }}
        />

        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--skin-primary) 0%, transparent 60%, var(--skin-accent) 100%)' }} />
        <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className={compact ? 'text-lg' : 'text-xl'}>{ownerAvatar}</span>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Cartela #{card.id}
                </span>
                <p className={`font-bold text-slate-700 dark:text-slate-300 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {ownerName}
                </p>
              </div>
            </div>
            {!card.isComplete && (
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isAlmostComplete
                ? 'bg-brand-gold/20 text-brand-gold animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                {remaining === 0 ? '✨' : `Falta${remaining > 1 ? 'm' : ''} ${remaining}`}
              </span>
            )}
          </div>

          {/* Grid 5x5 */}
          <div className={`grid grid-cols-5 ${compact ? 'gap-1' : 'gap-1.5'}`}>
            {card.numbers.map(num => {
              const isMarked = card.markedNumbers.includes(num);
              const isJustDrawn = num === lastDrawnNumber;

              return (
                <motion.div
                  key={num}
                  animate={isJustDrawn ? { scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  className={`relative aspect-square flex items-center justify-center rounded-2xl transition-all duration-300 ${compact ? 'text-[9px]' : 'text-xs'
                    } font-bold overflow-hidden ${isMarked
                      ? isJustDrawn
                        ? 'text-white shadow-[0_0_20px_var(--skin-accent)] scale-110 ring-4 ring-[var(--skin-accent)] z-20'
                        : card.ownerId === 'p1'
                          ? 'text-white shadow-lg ring-1 ring-[var(--skin-primary)]/50 backdrop-blur-sm'
                          : card.ownerId === 'p2'
                            ? 'text-white shadow-lg ring-1 ring-[var(--skin-accent)]/50 backdrop-blur-sm'
                            : 'text-white shadow-lg ring-1 ring-white/50 backdrop-blur-sm'
                      : 'bg-[#0000000a] dark:bg-[#ffffff0a] text-[var(--skin-text-main)] border border-[var(--skin-border)] hover:bg-[var(--skin-primary)]/10 hover:border-[var(--skin-primary)]/50'
                    }`}
                  style={isMarked ? {
                    background: isJustDrawn
                      ? 'var(--skin-accent)'
                      : card.ownerId === 'p1'
                        ? 'linear-gradient(135deg, var(--skin-primary), var(--skin-accent))'
                        : card.ownerId === 'p2'
                          ? 'linear-gradient(135deg, var(--skin-accent), var(--skin-primary))'
                          : 'linear-gradient(135deg, #94a3b8, #64748b)'
                  } : { backgroundColor: 'var(--skin-glass)' }}
                >
                  {/* Se estiver marcado, mostra o ícone do tema sutilmente no background e o número acima */}
                  {isMarked ? (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center opacity-30 scale-[1.5] pointer-events-none" style={{ color: 'white' }}>
                        {getThemeStamp()}
                      </span>
                      <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] font-black text-sm">{num}</span>
                    </>
                  ) : (
                    num
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BingoCardView;
