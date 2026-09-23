import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playTick, playSpinStart, playReveal } from '@/services/soundService';

interface BingoDrawAnimationProps {
  onComplete: (drawnNumber: number) => void;
  availableNumbers: number[];
  playerName: string;
  playerAvatar: string;
  autoStart?: boolean;
  targetNumber?: number;
  isTurbo?: boolean;
}

type DrawState = 'idle' | 'spinning' | 'revealing' | 'done';

const BingoDrawAnimation: React.FC<BingoDrawAnimationProps> = ({
  onComplete,
  availableNumbers,
  playerName,
  playerAvatar,
  autoStart = false,
  targetNumber,
  isTurbo = false,
}) => {
  const [state, setState] = useState<DrawState>('idle');
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [finalNumber, setFinalNumber] = useState<number | null>(null);
  const hasAutoStarted = useRef(false);

  const startDraw = useCallback(() => {
    if (availableNumbers.length === 0 && !targetNumber) return;
    setState('spinning');
    playSpinStart();

    const chosen = targetNumber ?? availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    setFinalNumber(chosen);

    let count = 0;
    const maxCycles = isTurbo ? 10 : 25;
    const speed = isTurbo ? 50 : 100;
    const numbersPool = availableNumbers.length > 0 ? availableNumbers : [chosen];
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * numbersPool.length);
      setDisplayNumber(numbersPool[randIdx]);
      if (!isTurbo) playTick();
      count++;
      if (count >= maxCycles) {
        clearInterval(interval);
        setDisplayNumber(chosen);
        setState('revealing');
        if (!isTurbo) playReveal();

        if (navigator.vibrate && !isTurbo) navigator.vibrate(200);

        setTimeout(() => {
          setState('done');
          onComplete(chosen);
        }, isTurbo ? 200 : 1500);
      }
    }, speed);
  }, [availableNumbers, onComplete, targetNumber, isTurbo]);

  // Auto-start support
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current && state === 'idle') {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => startDraw(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, state, startDraw]);

  // Reset when key props change
  useEffect(() => {
    setState('idle');
    setDisplayNumber(null);
    setFinalNumber(null);
    hasAutoStarted.current = false;
  }, [targetNumber, availableNumbers.length]);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {state === 'idle' && !autoStart && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <button
              onClick={startDraw}
              disabled={availableNumbers.length === 0 && !targetNumber}
              className="w-full bg-white text-brand-purple hover:bg-slate-50 disabled:opacity-50 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 group"
            >
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
              >
                🎱
              </motion.span>
              Sortear Número
            </button>
          </motion.div>
        )}

        {state === 'spinning' && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1, 0.9, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-brand-purple via-brand-magenta to-brand-gold shadow-2xl shadow-brand-purple/40 mb-4"
            >
              <motion.span
                key={displayNumber}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-black text-white"
              >
                {displayNumber ?? '?'}
              </motion.span>
            </motion.div>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest animate-pulse">
              Sorteando...
            </p>
          </motion.div>
        )}

        {(state === 'revealing' || state === 'done') && finalNumber !== null && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(230,194,110,0.4)',
                  '0 0 0 20px rgba(230,194,110,0)',
                  '0 0 0 0 rgba(230,194,110,0)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-brand-gold to-brand-magenta shadow-2xl mb-3"
            >
              <span className="text-5xl font-black text-white drop-shadow-lg">
                {finalNumber}
              </span>
            </motion.div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-2xl">{playerAvatar}</span>
              <p className="text-xs font-black text-white/80 uppercase tracking-widest">
                {playerName}
              </p>
            </div>

            {/* Confetti particles */}
            <div className="relative h-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                  }}
                  animate={{
                    opacity: 0,
                    x: (Math.random() - 0.5) * 200,
                    y: Math.random() * -150 - 50,
                    scale: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{ duration: 1.5, delay: i * 0.05 }}
                  className="absolute left-1/2 top-0 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#7c3aed', '#ec4899', '#e6c26e', '#f97316', '#10b981'][i % 5],
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BingoDrawAnimation;
