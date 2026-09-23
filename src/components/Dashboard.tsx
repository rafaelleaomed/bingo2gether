import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GameState, Transaction, RetentionState, BingoCard, BingoReward } from '../types';
import { formatCurrency, drawWeightedNumber, calculateIncomeRatio, findNumbersForExtraValue, calculateMonthlyTarget, calculateRetentionUpdate, checkInactivity } from '../services/gameLogic';
import { updateCardsAfterDraw, updateCardsAfterBatchDraw, syncCardsWithDrawnNumbers } from '../services/bingoCardService';
import {
  Trophy, Target, Calendar, Users, Settings, Plus,
  Sparkles, Lock, ChevronRight, Share2, Play, Pause, RotateCw,
  TrendingUp, Activity, Smartphone, Car, Home, Plane, Gem,
  MessageSquare, Send, X, AlertTriangle, Info, Check,
  Sun, Moon, Monitor, Flame, Crown, Map as MapIcon, Heart,
  CalendarHeart, TrendingDown, RotateCcw, Printer, Settings2,
  ArrowRight, ArrowLeft, LogOut, Clock, Grid3X3, CirclePlay, Volume2, VolumeX
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playBingo } from '../services/soundService';
import GeminiCoach from './GeminiCoach';
import GameSummary from './GameSummary';
import PrintView from './PrintView';
import BingoCardView from './bingo/BingoCardView';
import { useTheme } from '../ThemeContext';
import { BingoLogo } from './Onboarding';
import { PricingModal } from './premium/PricingModal';
import { SKINS, SkinType } from '../skins';
import { useAuthStore } from '../store/authStore';
import { useSkinStore, SkinTheme } from '../store/skinStore';
import { CoupleSettings } from './couple/CoupleSettings';
import SalesPage from './premium/SalesPage';
import BingoCardsGrid from './bingo/BingoCardsGrid';
import BingoDrawAnimation from './bingo/BingoDrawAnimation';
import BingoCelebration from './bingo/BingoCelebration';
import DrawThermometer from './bingo/DrawThermometer';
import { Interactive3DWrapper } from './ui/Interactive3DWrapper';

interface DashboardProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onReset: () => void;
}

const CARD_SIZE = 25;

// ─── Bottom Tab Bar ────────────────────────────────────────────
type BottomTab = 'bingo' | 'historico' | 'cartelas';

const BottomTabBar: React.FC<{ active: BottomTab; onChange: (t: BottomTab) => void }> = ({ active, onChange }) => {
  const tabs: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'bingo', label: 'Bingo', icon: <CirclePlay size={20} /> },
    { id: 'historico', label: 'Histórico', icon: <Clock size={20} /> },
    { id: 'cartelas', label: 'Cartelas', icon: <Grid3X3 size={20} /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t pb-[env(safe-area-inset-bottom)] transition-all"
      style={{
        background: 'var(--skin-card-bg)',
        borderTopColor: 'var(--skin-border)',
        backdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
        WebkitBackdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
      }}
    >
      <div className="max-w-md mx-auto flex">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${active === t.id ? 'text-brand-purple dark:text-brand-gold' : 'text-slate-400 dark:text-slate-500'}`}
          >
            {t.icon}
            <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
            {active === t.id && <div className="w-1 h-1 rounded-full bg-brand-purple dark:bg-brand-gold mt-0.5" />}
          </button>
        ))}
      </div>
    </nav>
  );
};

// ─── Sequential Draw Flow ──────────────────────────────────────
type SeqState = 'idle' | 'drawing' | 'paused-bingo' | 'complete';

interface SequentialDrawFlowProps {
  gameState: GameState;
  onDrawNumber: (num: number, playerId: 'p1' | 'p2') => BingoCard[];
  onComplete: () => void;
  onBingoDetected: (cards: BingoCard[]) => void;
}

const SequentialDrawFlow: React.FC<SequentialDrawFlowProps> = ({ gameState, onDrawNumber, onComplete, onBingoDetected }) => {
  const [seqState, setSeqState] = useState<SeqState>('idle');
  const [isTurbo, setIsTurbo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [queue, setQueue] = useState<{ num: number; playerId: 'p1' | 'p2' }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCardsDuringDraw, setCompletedCardsDuringDraw] = useState<BingoCard[]>([]);
  const pausedRef = React.useRef(false);

  // Calcula quanto da meta já foi batido no mês atual
  const monthlyProgress = useMemo(() => {
    const currentMonth = new Date().toLocaleDateString('pt-BR').slice(3); // "02/2026"
    return gameState.history.filter(t => t.type === 'monthly' && t.date.endsWith(currentMonth)).length;
  }, [gameState.history]);

  const buildDrawQueue = useCallback(() => {
    const available = [...gameState.availableNumbers];
    if (available.length === 0) return null;

    const alreadyDrawnThisMonth = monthlyProgress;
    const target = gameState.settings.monthlyTarget || Math.ceil((gameState.settings.maxNumber || 200) / (gameState.settings.deadlineMonths || 12));
    const totalToDraw = Math.max(0, target - alreadyDrawnThisMonth);

    let drawCount = 0;
    if (totalToDraw <= 0) {
      if (!confirm("A meta deste mês já foi atingida no histórico! Deseja sortear mais (apenas para teste)?")) {
        return null;
      }
      drawCount = Math.min(10, available.length);
    } else {
      drawCount = Math.min(totalToDraw, available.length);
    }
    const p1Count = Math.ceil(drawCount / 2);
    const draws: { num: number; playerId: 'p1' | 'p2' }[] = [];
    let pool = [...available];

    for (let i = 0; i < drawCount; i++) {
      const playerId: 'p1' | 'p2' = i < p1Count ? 'p1' : 'p2';
      const player = gameState.players[playerId];
      const num = drawWeightedNumber(pool, player, available);
      draws.push({ num, playerId });
      pool = pool.filter(n => n !== num);
    }
    return draws;
  }, [gameState, monthlyProgress]);

  // Animated one-by-one draw
  const startSequence = useCallback(() => {
    const draws = buildDrawQueue();
    if (!draws) return;
    setQueue(draws);
    setCurrentIndex(0);
    setCompletedCardsDuringDraw([]);
    setSeqState('drawing');
  }, [buildDrawQueue]);

  // Instant all-at-once draw (no animation)
  const startInstantDraw = useCallback(() => {
    const draws = buildDrawQueue();
    if (!draws || draws.length === 0) return;
    setQueue(draws);
    setCompletedCardsDuringDraw([]);
    // Process all draws instantly
    for (const item of draws) {
      const newlyCompleted = onDrawNumber(item.num, item.playerId);
      if (newlyCompleted.length > 0) {
        onBingoDetected(newlyCompleted);
      }
    }
    setCurrentIndex(draws.length - 1);
    setSeqState('complete');
  }, [buildDrawQueue, onDrawNumber, onBingoDetected]);

  const resumeAfterBingo = useCallback(() => {
    setSeqState('drawing');
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      setTimeout(() => setSeqState('complete'), 400);
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [currentIndex, queue.length]);

  const handleAnimationComplete = useCallback((drawnNumber: number) => {
    const item = queue[currentIndex];
    if (!item) return;

    const newlyCompleted = onDrawNumber(item.num, item.playerId);

    if (newlyCompleted.length > 0) {
      setCompletedCardsDuringDraw(prev => [...prev, ...newlyCompleted]);
      onBingoDetected(newlyCompleted);
      setSeqState('paused-bingo');
      return;
    }

    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      setTimeout(() => setSeqState('complete'), 800);
    } else {
      if (pausedRef.current) return;
      const delay = isTurbo ? 100 : 800;
      setTimeout(() => setCurrentIndex(nextIdx), delay);
    }
  }, [currentIndex, queue, isTurbo, onDrawNumber, onBingoDetected]);

  const handlePause = () => {
    setPaused(true);
    pausedRef.current = true;
  };

  const handleResume = () => {
    setPaused(false);
    pausedRef.current = false;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      setSeqState('complete');
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const currentItem = queue[currentIndex];
  const currentPlayerName = currentItem ? gameState.players[currentItem.playerId].name : '';
  const currentPlayerAvatar = currentItem ? gameState.players[currentItem.playerId].avatar : '';

  if (seqState === 'idle') {
    return (
      <div className="text-center space-y-3">
        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
          {gameState.settings.monthlyTarget} números para sortear este mês
        </p>
        <button
          onClick={startSequence}
          disabled={gameState.availableNumbers.length === 0}
          className="w-full bg-white text-brand-purple hover:bg-slate-50 disabled:opacity-50 px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          🎱 Sortear Um por Um
        </button>
        <button
          onClick={startInstantDraw}
          disabled={gameState.availableNumbers.length === 0}
          className="w-full bg-gradient-to-r from-brand-gold to-amber-500 text-brand-purple hover:brightness-110 disabled:opacity-50 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-gold/20 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          ⚡ Sortear Todos de Uma Vez
        </button>
      </div>
    );
  }

  if (seqState === 'paused-bingo') {
    const remaining = queue.length - currentIndex - 1;
    return (
      <div className="text-center space-y-4 animate-in fade-in duration-300">
        <DrawThermometer current={monthlyProgress} target={gameState.settings.monthlyTarget} isTurbo={isTurbo} />
        <div className="bg-white/10 rounded-2xl p-5 border border-brand-gold/30">
          <div className="text-4xl mb-2">⏸️</div>
          <p className="text-sm font-black text-white uppercase tracking-widest mb-1">Sorteio pausado</p>
          <p className="text-[10px] text-white/60 font-bold">Uma cartela foi completada! Veja a celebração acima.</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={resumeAfterBingo}
            className="w-full bg-brand-gold text-brand-purple py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play size={18} /> {remaining > 0 ? 'Retomar Um por Um' : 'Finalizar Mês'}
          </button>
          {remaining > 0 && (
            <button
              onClick={startInstantDraw}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              ⚡ Sortear Restante de Uma Vez
            </button>
          )}
        </div>
      </div>
    );
  }

  if (seqState === 'drawing' && currentItem) {
    if (paused) {
      return (
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <DrawThermometer current={monthlyProgress} target={gameState.settings.monthlyTarget} isTurbo={isTurbo} />
          <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
            <div className="text-4xl mb-2">⏸️</div>
            <p className="text-sm font-black text-white uppercase tracking-widest mb-1">Sorteio Pausado</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleResume}
              className="w-full bg-white text-brand-purple py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} /> Retomar Um por Um
            </button>
            <button
              onClick={startInstantDraw}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              ⚡ Sortear Restante de Uma Vez
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <DrawThermometer current={monthlyProgress} target={gameState.settings.monthlyTarget} isTurbo={isTurbo} />

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
              Sorteio {currentIndex + 1} de {queue.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTurbo(!isTurbo)}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 ${isTurbo ? 'bg-brand-gold text-brand-purple shadow-lg shadow-brand-gold/40' : 'bg-white/20 text-white'}`}
              >
                🚀 {isTurbo ? 'Turbo ON' : 'Turbo OFF'}
              </button>
              <button onClick={handlePause} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1">
                <Pause size={12} /> Pausar
              </button>
            </div>
          </div>

          <BingoDrawAnimation
            autoStart
            key={`draw-${currentIndex}`}
            playerName={currentPlayerName}
            playerAvatar={currentPlayerAvatar}
            availableNumbers={gameState.availableNumbers}
            targetNumber={currentItem.num}
            onComplete={handleAnimationComplete}
            isTurbo={isTurbo}
          />
        </div>
      </div>
    );
  }

  // ─── Complete Summary ───────────────────────────────────────
  const currentMonth = new Date().toLocaleDateString('pt-BR').slice(3);
  const thisMonthHistory = gameState.history.filter(t => t.type === 'monthly' && t.date.endsWith(currentMonth));

  const p1Drawn = thisMonthHistory.filter(d => d.playerId === 'p1');
  const p2Drawn = thisMonthHistory.filter(d => d.playerId === 'p2');
  const p1Total = p1Drawn.reduce((a, d) => a + d.number, 0);
  const p2Total = p2Drawn.reduce((a, d) => a + d.number, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="text-center mb-2">
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="text-lg font-black text-white uppercase tracking-widest">Sorteio Completo!</h3>
        <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{thisMonthHistory.length} números sorteados este mês</p>
      </div>

      {/* Player breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <span className="text-2xl">{gameState.players.p1.avatar}</span>
          <p className="text-xs font-black text-white mt-1">{gameState.players.p1.name}</p>
          <p className="text-lg font-black text-brand-gold">{formatCurrency(p1Total)}</p>
          <div className="flex flex-wrap gap-1 mt-2 justify-center max-h-24 overflow-y-auto custom-scrollbar">
            {p1Drawn.map(d => (
              <span key={d.id} className="bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-lg">{d.number}</span>
            ))}
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <span className="text-2xl">{gameState.players.p2.avatar}</span>
          <p className="text-xs font-black text-white mt-1">{gameState.players.p2.name}</p>
          <p className="text-lg font-black text-brand-gold">{formatCurrency(p2Total)}</p>
          <div className="flex flex-wrap gap-1 mt-2 justify-center max-h-24 overflow-y-auto custom-scrollbar">
            {p2Drawn.map(d => (
              <span key={d.id} className="bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-lg">{d.number}</span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-white text-brand-purple py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
      >
        Fechar Resumo
      </button>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────
const Dashboard: React.FC<DashboardProps> = ({ gameState, onUpdateState, onReset }) => {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuthStore();

  const [coachMode, setCoachMode] = useState<'incentive' | 'challenge' | null>(null);
  const [isAnniversaryBonus, setIsAnniversaryBonus] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [bingoReward, setBingoReward] = useState('Jantar Romântico! 🍝🍷');
  const [activeTab, setActiveTab] = useState<BottomTab>('bingo');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSalesPage, setShowSalesPage] = useState(false);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showLastTip, setShowLastTip] = useState(false);

  // V2 Celebration state
  const [celebrationCard, setCelebrationCard] = useState<BingoCard | null>(null);
  const [celebrationReward, setCelebrationReward] = useState<string>('');
  const [lastV2DrawnNumber, setLastV2DrawnNumber] = useState<number | null>(null);

  const isV2 = gameState.interactiveBingoV2 === true && (gameState.bingoCardsV2?.length ?? 0) > 0;

  // Draw states
  const [drawMode, setDrawMode] = useState<'batch' | 'single'>('batch');
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [sessionDrawCount, setSessionDrawCount] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2'>('p1');
  const [coachUsedThisSession, setCoachUsedThisSession] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);

  // Route Modal State
  const [routeTab, setRouteTab] = useState<'income' | 'extra' | 'deadline' | 'skins'>('income');
  const [newP1Income, setNewP1Income] = useState(gameState.players.p1.estimatedIncome.toString());
  const [newP2Income, setNewP2Income] = useState(gameState.players.p2.estimatedIncome.toString());
  const [extraValue, setExtraValue] = useState('');
  const [newDeadline, setNewDeadline] = useState(gameState.settings.deadlineMonths);

  const totalBingo = gameState.drawnNumbers.reduce((a, b) => a + b, 0);
  const totalSaved = totalBingo;
  const totalGoal = gameState.settings.totalBingoGoal;
  const progress = Math.min(100, (totalSaved / totalGoal) * 100);
  const isGameOver = gameState.availableNumbers.length === 0;

  const retentionState: RetentionState = gameState.retention || {
    coupleStreak: 0, lastPlayDate: null, survivalMode: false, lastActivityDate: new Date().toISOString()
  };

  const isRitualDay = useMemo(() => new Date().getDay() === (gameState.settings.ritualDay ?? 0), [gameState.settings.ritualDay]);

  // Sincroniza a skin escolhida no gameState com a global SkinStore que afeta a DOM HTML
  useEffect(() => {
    let skinId = gameState.settings.skin || 'default';
    if (skinId === 'dark_luxury' as any) skinId = 'carbon';
    if (skinId === 'travel' as any) skinId = 'viagem';
    const storeTheme = skinId === 'default' ? 'carbon' : skinId;
    useSkinStore.getState().setTheme(storeTheme as SkinTheme);
  }, [gameState.settings.skin]);
  useEffect(() => {
    const anniversary = gameState.settings.coupleAnniversary;
    if (!anniversary) return;
    const anniversaryDay = new Date(anniversary).getDate();
    const today = new Date();
    if (today.getDate() === anniversaryDay) {
      const key = `bingo_anniversary_${today.getFullYear()}-${today.getMonth()}`;
      if (!localStorage.getItem(key)) {
        setShowAnniversaryModal(true);
        localStorage.setItem(key, 'shown');
      }
    }
  }, [gameState.settings.coupleAnniversary]);

  const isSurvivalMode = useMemo(() => retentionState.survivalMode || checkInactivity(retentionState), [retentionState]);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun size={18} />;
    if (theme === 'dark') return <Moon size={18} />;
    return <Monitor size={18} />;
  };

  const numberOwners = useMemo(() => {
    const map = new Map<number, 'p1' | 'p2'>();
    gameState.history.forEach(tx => map.set(tx.number, tx.playerId));
    return map;
  }, [gameState.history]);

  // Mock data para visualização caso o banco esteja vazio
  const effectiveHistory = useMemo(() => {
    if (gameState.history && gameState.history.length > 0) return gameState.history;
    const today = new Date().toLocaleDateString('pt-BR');
    return [
      { id: 'mock-1', playerId: 'p1', number: 51, type: 'monthly', date: today, timestamp: Date.now() - 10000 },
      { id: 'mock-2', playerId: 'p1', number: 190, type: 'monthly', date: today, timestamp: Date.now() - 20000 },
      { id: 'mock-3', playerId: 'p2', number: 20, type: 'monthly', date: today, timestamp: Date.now() - 30000 },
      { id: 'mock-4', playerId: 'p1', number: 164, type: 'extra', date: today, timestamp: Date.now() - 40000 },
    ] as Transaction[];
  }, [gameState.history]);

  const latestDrawData = useMemo(() => {
    if (effectiveHistory.length === 0) return null;
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const monthlyBatch = effectiveHistory.filter(tx => {
      if (!tx.date) return false;
      const parts = tx.date.split('/');
      if (parts.length === 3) return `${parts[1]}/${parts[2]}` === currentMonthStr;
      return true; // Fallback para mock data que pode ter data simplificada
    });
    if (monthlyBatch.length === 0) return null;
    const p1Numbers = monthlyBatch.filter(tx => tx.playerId === 'p1').map(tx => tx.number).sort((a, b) => a - b);
    const p2Numbers = monthlyBatch.filter(tx => tx.playerId === 'p2').map(tx => tx.number).sort((a, b) => a - b);
    return { date: monthlyBatch[0].date, p1Numbers, p2Numbers, p1Sum: p1Numbers.reduce((a, b) => a + b, 0), p2Sum: p2Numbers.reduce((a, b) => a + b, 0), total: p1Numbers.reduce((a, b) => a + b, 0) + p2Numbers.reduce((a, b) => a + b, 0) };
  }, [gameState.history]);

  const checkCompletedCards = (drawnSet: Set<number>) => {
    let completed = 0;
    const totalNums = gameState.settings.maxNumber;
    for (let i = 0; i < totalNums; i += CARD_SIZE) {
      const chunk = Array.from({ length: Math.min(CARD_SIZE, totalNums - i) }, (_, j) => i + j + 1);
      if (chunk.every(n => drawnSet.has(n))) completed++;
    }
    return completed;
  };

  const bingoCards = useMemo(() => {
    const cards: BingoCard[] = [];
    const totalNums = gameState.settings.maxNumber;
    let cardCount = 0;
    for (let i = 0; i < totalNums; i += CARD_SIZE) {
      const chunk = Array.from({ length: Math.min(CARD_SIZE, totalNums - i) }, (_, j) => i + j + 1);
      const marked = chunk.filter(n => numberOwners.has(n));
      cardCount++;
      cards.push({
        id: cardCount,
        numbers: chunk,
        isComplete: chunk.every(n => numberOwners.has(n)),
        markedNumbers: marked,
        ownerId: 'shared' // default for display on dashboard
      });
    }

    // Distribute visual ownership equally like in V2 for display purposes
    const half = Math.floor(cards.length / 2);
    cards.forEach((card, index) => {
      if (index < half) card.ownerId = 'p1';
      else if (index < half * 2) card.ownerId = 'p2';
      else card.ownerId = 'shared';
    });

    return cards;
  }, [gameState.settings.maxNumber, numberOwners]);

  const getRandomReward = () => {
    const rewards = [
      "Escolhe o restaurante da semana! 🍽️", "Não lava louça por 7 dias! 🍽️✨",
      "Ganha massagem de 30 min! 💆", "Escolhe o filme do mês! 🎬",
      "Dia de folga de tarefas! 🛋️", "Café da manhã na cama! ☕🥞",
      "Escolhe a playlist da semana! 🎵", "Jantar Romântico! 🍝🍷",
      "Vale Pedido Especial! 🎫✨", "Piquenique no Parque! 🥪🌳",
    ];
    return rewards[Math.floor(Math.random() * rewards.length)];
  };

  const handleV2BingoDetected = (completedCards: BingoCard[], newState: GameState) => {
    if (completedCards.length === 0) return newState;
    const scoreUpdate = { ...(newState.competitiveScore || { p1: 0, p2: 0 }) };
    const rewardsUpdate = [...(newState.bingoRewards || [])];
    completedCards.forEach(card => {
      const winnerId = card.ownerId === 'shared' ? 'p1' : card.ownerId;
      scoreUpdate[winnerId] = (scoreUpdate[winnerId] || 0) + 1;
      rewardsUpdate.push({ id: crypto.randomUUID(), cardId: card.id, winnerId, reward: getRandomReward(), isCustom: false, date: new Date().toISOString() });
    });
    setCelebrationReward(getRandomReward());
    setCelebrationCard(completedCards[0]);
    playBingo();
    return { ...newState, competitiveScore: scoreUpdate, bingoRewards: rewardsUpdate };
  };

  // Sequential draw handler – returns newly completed cards for pause/resume
  const handleSequentialDrawNumber = useCallback((num: number, playerId: 'p1' | 'p2'): BingoCard[] => {
    const currentTimestamp = Date.now();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const transaction: Transaction = { id: crypto.randomUUID(), number: num, playerId, date: currentDate, type: 'monthly', timestamp: currentTimestamp };

    setUndoStack(prev => [gameState, ...prev.slice(0, 4)]);
    let completedDuringDraw: BingoCard[] = [];

    let newState: GameState = {
      ...gameState,
      availableNumbers: gameState.availableNumbers.filter(n => n !== num),
      drawnNumbers: [num, ...gameState.drawnNumbers],
      history: [transaction, ...gameState.history],
      players: {
        ...gameState.players,
        [playerId]: { ...gameState.players[playerId], totalContributed: gameState.players[playerId].totalContributed + num }
      },
      retention: calculateRetentionUpdate(retentionState)
    };

    if (isV2 && gameState.bingoCardsV2) {
      const { updatedCards, newlyCompleted } = updateCardsAfterDraw(gameState.bingoCardsV2, num);
      newState = { ...newState, bingoCardsV2: updatedCards };
      setLastV2DrawnNumber(num);
      completedDuringDraw = newlyCompleted;
      // Don't trigger celebration here – the SequentialDrawFlow will handle pause
    }

    // Legacy bingo check
    const newDrawnSet = new Set(newState.drawnNumbers);
    const completedBefore = checkCompletedCards(new Set(gameState.drawnNumbers));
    const completedAfter = checkCompletedCards(newDrawnSet);
    if (!isV2 && completedAfter > completedBefore) {
      setBingoReward(getRandomReward());
      setShowBingoModal(true);
    }

    onUpdateState(newState);
    setSessionDrawCount(prev => prev + 1);
    return completedDuringDraw;
  }, [gameState, retentionState, isV2, onUpdateState]);

  // Single draw via V2 animation
  const handleV2AnimationDraw = (drawnNumber: number) => {
    const playerId = currentTurn;
    setUndoStack(prev => [gameState, ...prev.slice(0, 4)]);
    const currentTimestamp = Date.now();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const transaction: Transaction = { id: crypto.randomUUID(), number: drawnNumber, playerId, date: currentDate, type: 'monthly', timestamp: currentTimestamp };
    const newAvailable = gameState.availableNumbers.filter(n => n !== drawnNumber);
    const newDrawnNumbers = [drawnNumber, ...gameState.drawnNumbers];
    const newRetention = calculateRetentionUpdate(retentionState);

    let newState: GameState = {
      ...gameState,
      availableNumbers: newAvailable,
      drawnNumbers: newDrawnNumbers,
      history: [transaction, ...gameState.history],
      players: { ...gameState.players, [playerId]: { ...gameState.players[playerId], totalContributed: gameState.players[playerId].totalContributed + drawnNumber } },
      retention: newRetention
    };

    if (gameState.bingoCardsV2) {
      const { updatedCards, newlyCompleted } = updateCardsAfterDraw(gameState.bingoCardsV2, drawnNumber);
      newState = { ...newState, bingoCardsV2: updatedCards };
      setLastV2DrawnNumber(drawnNumber);
      if (newlyCompleted.length > 0) newState = handleV2BingoDetected(newlyCompleted, newState);
    }

    onUpdateState(newState);
    setSessionDrawCount(prev => prev + 1);
    setCurrentTurn(prev => prev === 'p1' ? 'p2' : 'p1');
    setTimeout(() => setLastV2DrawnNumber(null), 3000);
  };

  const undoLastDraw = () => {
    if (undoStack.length === 0) return;
    const [previousState, ...rest] = undoStack;
    onUpdateState(previousState);
    setUndoStack(rest);
    setSessionDrawCount(prev => Math.max(0, prev - 1));
    setCurrentTurn(prev => prev === 'p1' ? 'p2' : 'p1');
  };

  const handlePenalty = (loserId: 'p1' | 'p2') => {
    if (gameState.availableNumbers.length === 0) return;
    const idx = Math.floor(Math.random() * gameState.availableNumbers.length);
    const number = gameState.availableNumbers[idx];
    const transaction: Transaction = { id: crypto.randomUUID(), number, playerId: loserId, date: new Date().toLocaleDateString('pt-BR'), type: 'extra', loserName: gameState.players[loserId].name, timestamp: Date.now() };
    const newRetention = { ...retentionState, lastActivityDate: new Date().toISOString() };
    onUpdateState({
      ...gameState,
      availableNumbers: gameState.availableNumbers.filter(n => n !== number),
      drawnNumbers: [number, ...gameState.drawnNumbers],
      history: [transaction, ...gameState.history],
      players: { ...gameState.players, [loserId]: { ...gameState.players[loserId], totalContributed: gameState.players[loserId].totalContributed + number } },
      retention: newRetention
    });
    return number;
  };

  const liveIncomeRatio = useMemo(() => {
    const inc1 = parseFloat(newP1Income) || 0;
    const inc2 = parseFloat(newP2Income) || 0;
    return calculateIncomeRatio(inc1, inc2);
  }, [newP1Income, newP2Income]);

  const handleUpdateIncome = () => {
    const inc1 = parseFloat(newP1Income) || 0;
    const inc2 = parseFloat(newP2Income) || 0;
    const newRatio = calculateIncomeRatio(inc1, inc2);
    onUpdateState({ ...gameState, players: { p1: { ...gameState.players.p1, estimatedIncome: inc1, incomeShare: 100 - newRatio }, p2: { ...gameState.players.p2, estimatedIncome: inc2, incomeShare: newRatio } } });
    setShowRouteModal(false);
  };

  const handleAddExtraValue = () => {
    const val = parseFloat(extraValue);
    if (!val || val <= 0) return;
    const { numbers } = findNumbersForExtraValue(gameState.availableNumbers, val);
    if (numbers.length === 0) { alert("Não foi possível abater números com este valor."); return; }
    const newAvailable = gameState.availableNumbers.filter(n => !numbers.includes(n));
    const newMonthlyTarget = calculateMonthlyTarget(newAvailable.length, gameState.settings.deadlineMonths);
    const p2Ratio = gameState.players.p2.incomeShare / 100;
    const p1Portion = Math.round(val * (1 - p2Ratio));
    const p2Portion = val - p1Portion;
    const p2Count = Math.round(numbers.length * p2Ratio);
    const newTransactions: Transaction[] = numbers.map((num, idx) => ({
      id: crypto.randomUUID(), number: num, playerId: idx < p2Count ? 'p2' : 'p1', date: new Date().toLocaleDateString('pt-BR'), type: 'bonus', timestamp: Date.now()
    } as Transaction));
    const newRetention = calculateRetentionUpdate(retentionState);
    onUpdateState({
      ...gameState, availableNumbers: newAvailable, drawnNumbers: [...numbers, ...gameState.drawnNumbers],
      history: [...newTransactions, ...gameState.history], settings: { ...gameState.settings, monthlyTarget: newMonthlyTarget },
      players: { p1: { ...gameState.players.p1, totalContributed: gameState.players.p1.totalContributed + p1Portion }, p2: { ...gameState.players.p2, totalContributed: gameState.players.p2.totalContributed + p2Portion } },
      retention: newRetention
    });
    setShowRouteModal(false); setExtraValue('');
    alert(`Sucesso! ${numbers.length} números abatidos.`);
  };

  const handleUpdateDeadline = () => {
    const newMonthlyTarget = calculateMonthlyTarget(gameState.availableNumbers.length, newDeadline);
    onUpdateState({ ...gameState, settings: { ...gameState.settings, deadlineMonths: newDeadline, monthlyTarget: newMonthlyTarget } });
    setShowRouteModal(false);
  };

  const latestBatch = useMemo(() => {
    const p1Numbers: number[] = []; const p2Numbers: number[] = [];
    const batch = gameState.history.filter(t => t.type === 'monthly');
    if (batch.length === 0) return null;
    const latestDate = batch[0].date;
    const lb = batch.filter(t => t.date === latestDate);
    lb.forEach(t => { if (t.playerId === 'p1') p1Numbers.push(t.number); else p2Numbers.push(t.number); });
    return { date: lb[0].date, p1Numbers, p2Numbers, p1Sum: p1Numbers.reduce((a, b) => a + b, 0), p2Sum: p2Numbers.reduce((a, b) => a + b, 0) };
  }, [gameState.history]);

  const currentSkin = useMemo(() => {
    let skinKey = (gameState.settings.skin || 'default') as SkinType;
    // Map legacy keys securely so users who chose 'dark_luxury' or 'travel' don't lose them
    if (skinKey === 'dark_luxury' as any) skinKey = 'carbon';
    if (skinKey === 'travel' as any) skinKey = 'viagem';
    return SKINS[skinKey] || SKINS.default;
  }, [gameState.settings.skin]);

  const skinId = currentSkin.id;
  const isMatrimoney = skinId === 'matrimoney';

  const skinStyles = {
    '--skin-bg': currentSkin.colors.background, '--skin-card-bg': currentSkin.colors.cardBg,
    '--skin-text-main': currentSkin.colors.textMain, '--skin-text-muted': currentSkin.colors.textMuted,
    '--skin-primary': currentSkin.colors.primary, '--skin-accent': currentSkin.colors.accent,
    '--skin-border': currentSkin.colors.border, '--skin-shadow': currentSkin.effects.shadow,
    '--skin-glass': currentSkin.effects.glassBlur, '--skin-radius': currentSkin.effects.borderRadius,
    '--skin-border-width': currentSkin.effects.borderWidth,
    '--font-header': currentSkin.fonts.header, '--font-body': currentSkin.fonts.body,
  } as React.CSSProperties;

  const handleCoachUsed = () => {
    if (coachUsedThisSession) return;
    setCoachUsedThisSession(true);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = gameState.retention?.coachUsage || { lastUsageMonth: currentMonth, count: 0 };
    const newCount = usage.lastUsageMonth === currentMonth ? usage.count + 1 : 1;
    onUpdateState({ ...gameState, retention: { ...retentionState, coachUsage: { lastUsageMonth: currentMonth, count: newCount } } });
  };

  if (isGameOver) return <GameSummary gameState={gameState} onReset={onReset} />;

  return (
    <div
      className={`min-h-screen text-slate-800 dark:text-slate-100 pb-24 transition-all duration-500 bg-cover bg-fixed bg-center ${isMatrimoney ? 'matrimoney-particles' : ''}`}
      style={{ ...skinStyles, fontFamily: 'var(--font-body)', color: 'var(--skin-text-main)' }}
    >
      {/* Matrimoney decorative overlays */}
      {isMatrimoney && <>
        <div className="matrimoney-overlay" />
        <span className="matrimoney-particle-extra">✦</span>
      </>}
      {/* ─── Header ────────────────────────────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] shadow-sm transition-all duration-500"
        style={{
          background: 'var(--skin-card-bg)',
          borderBottomColor: 'var(--skin-border)',
          backdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
          WebkitBackdropFilter: 'blur(calc(var(--skin-glass) + 8px))',
        }}
      >
        <div className="max-w-md mx-auto flex gap-3 justify-between items-center">
          <div className="flex items-center gap-2">
            <BingoLogo className="w-10 h-10 border-[1.5px]" />
            <div className="flex flex-col">
              <h1 className={`font-black tracking-tight leading-none ${isMatrimoney ? 'matrimoney-shimmer' : 'drop-shadow-sm'}`} style={{ color: isMatrimoney ? undefined : 'var(--skin-primary)', fontFamily: isMatrimoney ? 'var(--font-header)' : undefined }}>
                {gameState.settings.customGoalName || (isMatrimoney ? 'MatriMoney 💍' : 'Bingo2Gether')}
              </h1>
              {retentionState.coupleStreak > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame size={10} className="text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none">{retentionState.coupleStreak} dias seguidos</span>
                </div>
              )}
              {user?.partnerName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Heart size={10} className="text-brand-magenta fill-brand-magenta" />
                  <span className="text-[10px] font-bold text-brand-magenta uppercase tracking-widest leading-none">Com {user.partnerName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm" title={soundOn ? 'Som ligado' : 'Som desligado'}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
            <button onClick={() => setShowRouteModal(true)} className="text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95" style={{ backgroundColor: 'var(--skin-primary)' }}><MapIcon size={16} /> <span className="hidden sm:inline">Ajuste</span></button>
            <button onClick={() => setShowCoupleModal(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-500 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-all active:scale-95 shadow-sm" title="Minha Dupla"><Heart size={18} className="fill-current" /></button>
            <button onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95 shadow-sm" title="Sair"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {/* ─── Banners ───────────────────────────── */}
      <div className="max-w-md mx-auto px-4 mt-2 space-y-2">
        {isRitualDay && !isGameOver && (
          <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg text-pink-500 shadow-sm"><CalendarHeart size={16} /></div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">Dia de Conexão</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight">Hoje é dia de Bingo2Gether! Que tal avançar um pouco juntos?</p>
            </div>
          </div>
        )}
        {isSurvivalMode && !isGameOver && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg text-amber-500 shadow-sm"><TrendingDown size={16} /></div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Modo Meses Difíceis</p>
              <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-tight">O mês apertou? Jogar pequeno ainda é jogar. A dupla continua!</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Legacy Bingo Modal ─────────────────── */}
      {showBingoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowBingoModal(false)}>
          <div className="rounded-[3rem] p-10 max-w-sm w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in-50 duration-500" style={{ background: 'var(--skin-card-bg)', backdropFilter: 'blur(calc(var(--skin-glass) + 10px))', boxShadow: 'var(--skin-shadow)', border: '4px solid var(--skin-accent)', fontFamily: 'var(--font-header)' }} onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-brand-gold via-brand-magenta to-brand-gold animate-pulse"></div>
            <div className="mb-6 inline-block relative scale-125">
              <div className="text-7xl drop-shadow-lg mx-auto transform hover:scale-110 transition-transform">{currentSkin.icons.goal}</div>
              <Sparkles className="w-10 h-10 text-brand-magenta absolute -top-2 -right-4 animate-bounce" />
            </div>
            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-gold to-brand-magenta tracking-tighter mb-2 drop-shadow-sm">BINGO!</h2>
            <p className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest">Parabéns ao Casal!</p>
            <div className="bg-brand-gold/10 dark:bg-brand-gold/20 p-6 rounded-[2rem] border border-brand-gold/20 mb-8 relative">
              <p className="text-slate-600 dark:text-slate-300 font-bold leading-tight text-sm">Mais uma cartela conquistada! Vocês estão cada vez mais próximos do sonho.</p>
              <div className="mt-4 pt-4 border-t border-brand-gold/20">
                <p className="text-[10px] text-brand-purple dark:text-brand-gold font-black uppercase tracking-widest mb-1">Prêmio Sugerido</p>
                <p className="text-xl font-black text-brand-purple dark:text-brand-gold">{bingoReward}</p>
              </div>
            </div>
            <button onClick={() => setShowBingoModal(false)} className="w-full py-5 bg-brand-purple text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95">VAMOS COMEMORAR!</button>
          </div>
        </div>
      )}

      {showCoupleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCoupleModal(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 dark:bg-slate-800 p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 rounded-t-[2.5rem]">
              <button onClick={() => setShowCoupleModal(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><ArrowLeft size={20} /></button>
              <h3 className="font-black text-brand-purple dark:text-brand-gold uppercase tracking-widest text-sm flex items-center gap-2"><Heart size={18} className="fill-current text-pink-500" /> Minha Dupla</h3>
            </div>
            <div className="p-6">
              <CoupleSettings />
            </div>
          </div>
        </div>
      )}

      {showAnniversaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAnniversaryModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in-50 duration-500 border-2 border-pink-200 dark:border-pink-800" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400 animate-pulse"></div>
            <div className="text-7xl mb-4 animate-bounce">💕</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-pink-500 to-rose-600 mb-2">Feliz Mesversário!</h2>
            <p className="text-lg font-black text-slate-800 dark:text-white mb-2">{gameState.players.p1.name} & {gameState.players.p2.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">Mais um mês juntos construindo o futuro! Que tal um desafio especial para comemorar? 🎉</p>
            <button onClick={() => { setShowAnniversaryModal(false); setIsAnniversaryBonus(true); setCoachMode('challenge'); }} className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all mb-3">🥊 Aceitar Desafio Especial</button>
            <button onClick={() => setShowAnniversaryModal(false)} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Talvez mais tarde</button>
          </div>
        </div>
      )}

      {/* ─── Main Content ──────────────────────── */}
      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* ─── TAB: BINGO ──────────────────────── */}
        {activeTab === 'bingo' && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 fade-in duration-500">

            {/* AI Coach - Top of Dashboard with Inline Preview */}
            {(() => {
              // Read last tip from localStorage for inline preview
              let lastTip: { title?: string; practicalTip?: string; bingoImpact?: string; timeImpact?: string } = {};
              try {
                const savedLastTip = localStorage.getItem('bingo_last_tip_preview');
                if (savedLastTip) lastTip = JSON.parse(savedLastTip);
              } catch { }

              return (
                <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-[2.5rem] p-1.5 border-2 border-brand-purple/10 dark:border-brand-purple/30 shadow-xl shadow-brand-purple/5 transition-all">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-brand-purple/5 dark:border-brand-purple/20 mb-1">
                    <Sparkles size={16} className="text-brand-magenta fill-brand-magenta" />
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Coach de IA</span>
                  </div>

                  {/* Inline Preview of Last Tip - Clickable */}
                  {lastTip.practicalTip && (
                    <button
                      onClick={() => setShowLastTip(true)}
                      className="w-full text-left mx-0 mb-2 px-3"
                    >
                      <div className="p-3 bg-gradient-to-r from-brand-purple/5 to-brand-magenta/5 dark:from-brand-purple/10 dark:to-brand-magenta/10 rounded-2xl border border-brand-purple/10 hover:border-brand-purple/30 transition-all active:scale-[0.98]">
                        <p className="text-[10px] font-black text-brand-purple dark:text-brand-gold uppercase tracking-widest mb-1 flex items-center gap-1">
                          💡 Última dica <span className="text-slate-400 font-medium normal-case tracking-normal">• toque para ler</span>
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-100 leading-relaxed line-clamp-2">{lastTip.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1 line-clamp-1">{lastTip.practicalTip}</p>
                      </div>
                    </button>
                  )}

                  <div className="flex gap-2 p-2 pt-0">
                    <button onClick={() => setCoachMode('incentive')} className="flex-1 bg-brand-purple/10 dark:bg-brand-purple/20 hover:bg-brand-purple/20 py-4 rounded-2xl text-brand-purple font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">💡 Dica</button>
                    <button onClick={() => setCoachMode('challenge')} className="flex-1 bg-brand-magenta/10 dark:bg-brand-magenta/20 hover:bg-brand-magenta/20 py-4 rounded-2xl text-brand-magenta font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">🥊 Desafio</button>
                  </div>
                </div>
              );
            })()}

            {/* Last Tip Expanded Modal (no usage cost) */}
            {showLastTip && (() => {
              let tip: { title?: string; practicalTip?: string; bingoImpact?: string; timeImpact?: string } = {};
              try { const s = localStorage.getItem('bingo_last_tip_preview'); if (s) tip = JSON.parse(s); } catch { }
              return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowLastTip(false)}>
                  <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/20 dark:border-slate-700 animate-in zoom-in-95 duration-200 space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-brand-magenta" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Dica do Oráculo</span>
                      </div>
                      <button onClick={() => setShowLastTip(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                      </button>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">{tip.title}</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{tip.practicalTip}</p>
                    </div>
                    {(tip.bingoImpact || tip.timeImpact) && (
                      <div className="grid grid-cols-2 gap-3">
                        {tip.bingoImpact && (
                          <div className="bg-brand-purple/5 dark:bg-brand-purple/10 p-3 rounded-xl">
                            <p className="text-[9px] font-black text-brand-purple uppercase tracking-widest mb-1">Impacto</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{tip.bingoImpact}</p>
                          </div>
                        )}
                        {tip.timeImpact && (
                          <div className="bg-brand-magenta/5 dark:bg-brand-magenta/10 p-3 rounded-xl">
                            <p className="text-[9px] font-black text-brand-magenta uppercase tracking-widest mb-1">Tempo</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{tip.timeImpact}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => setShowLastTip(false)} className="w-full py-3 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-purple/90 transition-all active:scale-95">
                      Entendido! ✨
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Progress Card */}
            <Interactive3DWrapper
              className={`text-white rounded-[2.5rem] p-7 shadow-2xl relative overflow-hidden transition-all border border-white/5 ${isMatrimoney ? 'matrimoney-progress-card' : ''}`}
              style={{ background: 'linear-gradient(135deg, var(--skin-primary) 0%, var(--skin-accent) 100%)' }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'var(--skin-accent)', opacity: 0.3 }}></div>
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 opacity-80">
                      <Trophy size={16} className="text-brand-gold" />
                      <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Vocês já guardaram</p>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(totalSaved)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white drop-shadow-sm">{progress.toFixed(1)}%</p>
                    <p className="text-[10px] font-black text-brand-gold/60 uppercase tracking-widest">da meta</p>
                  </div>
                </div>
                <div className="h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-md border border-white/10 p-0.5">
                  <div className="h-full shadow-lg transition-all duration-1000 ease-out rounded-full" style={{ width: `${progress}%`, background: 'var(--skin-accent)' }}></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Meta: {formatCurrency(totalGoal)}</p>
                  {!gameState.settings.isPro && (
                    <div className="flex items-center gap-1.5 opacity-60">
                      <Lock size={10} className="text-brand-gold" />
                      <span className="text-[9px] font-bold text-brand-gold uppercase tracking-widest">Previsão Pro</span>
                    </div>
                  )}
                </div>
              </div>
            </Interactive3DWrapper>

            {/* Draw Section */}
            <Interactive3DWrapper
              className={`text-white p-7 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all border border-white/5 ${isMatrimoney ? 'matrimoney-draw-section' : ''}`}
              style={{ background: 'linear-gradient(135deg, var(--skin-accent) 0%, var(--skin-primary) 100%)' }}
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--skin-primary)', opacity: 0.3 }}></div>
              <div className="relative z-10">
                <div className="flex bg-white/10 p-1 rounded-xl mb-4">
                  <button onClick={() => setDrawMode('batch')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${drawMode === 'batch' ? 'bg-white text-brand-magenta shadow-sm' : 'text-white/60'}`}>Bingo Mensal</button>
                  <button onClick={() => { setDrawMode('single'); setSessionDrawCount(0); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${drawMode === 'single' ? 'bg-white text-brand-magenta shadow-sm' : 'text-white/60'}`}>Individual</button>
                </div>

                {drawMode === 'batch' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-white/60 text-[10px] font-black uppercase mb-1 flex items-center gap-2 tracking-widest"><Calendar size={12} /> Meta Mensal</h3>
                        <div className="text-3xl font-black flex items-baseline gap-2 text-white tracking-tight">
                          {gameState.settings.monthlyTarget} <span className="text-xs font-black text-white/60 uppercase tracking-widest">números</span>
                        </div>
                      </div>
                      <button onClick={undoLastDraw} disabled={undoStack.length === 0} className="bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-3 rounded-2xl font-black text-sm transition-all active:scale-95" title="Desfazer">↶</button>
                    </div>
                    <SequentialDrawFlow
                      gameState={gameState}
                      onDrawNumber={handleSequentialDrawNumber}
                      onComplete={() => setActiveTab('cartelas')}
                      onBingoDetected={(cards) => handleV2BingoDetected(cards, gameState)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{currentTurn === 'p1' ? gameState.players.p1.avatar : gameState.players.p2.avatar}</span>
                        <div>
                          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Vez de</p>
                          <p className="text-sm font-black text-white">{currentTurn === 'p1' ? gameState.players.p1.name : gameState.players.p2.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{sessionDrawCount} sorteado{sessionDrawCount !== 1 ? 's' : ''}</span>
                        <button onClick={undoLastDraw} disabled={undoStack.length === 0} className="bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95">↶</button>
                      </div>
                    </div>
                    <BingoDrawAnimation
                      onComplete={handleV2AnimationDraw}
                      availableNumbers={gameState.availableNumbers}
                      playerName={currentTurn === 'p1' ? gameState.players.p1.name : gameState.players.p2.name}
                      playerAvatar={currentTurn === 'p1' ? gameState.players.p1.avatar : gameState.players.p2.avatar}
                    />
                  </div>
                )}
              </div>
            </Interactive3DWrapper>

            {/* Quick access to cards */}
            {isV2 && gameState.bingoCardsV2 && gameState.bingoCardsV2.length > 0 && (
              <button
                onClick={() => setActiveTab('cartelas')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-xl">
                    <Grid3X3 size={18} className="text-brand-purple dark:text-brand-gold" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Nossas Cartelas</p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {gameState.bingoCardsV2.filter(c => c.isComplete).length} de {gameState.bingoCardsV2.length} completas
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}

            {/* PRO Banner - below all bingo content */}
            {!gameState.settings.isPro && (
              <div onClick={() => setShowPricingModal(true)} className="bg-gradient-to-r from-brand-purple to-brand-magenta p-[2px] rounded-[2.5rem] cursor-pointer hover:scale-[1.01] transition-all shadow-xl shadow-brand-purple/20">
                <div className="bg-white dark:bg-slate-900 rounded-[2.4rem] p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold/20 rounded-2xl"><Crown className="text-brand-gold" size={24} /></div>
                    <div>
                      <h4 className="font-black text-brand-purple dark:text-brand-gold uppercase tracking-widest text-xs">Ativar Versão PRO</h4>
                      <p className="text-[10px] text-slate-500 font-bold">IA + sync em tempo real.</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-brand-gold" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: HISTÓRICO ──────────────────── */}
        {activeTab === 'historico' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {/* Contributions Total */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><TrendingUp size={14} /> Contribuições Totais</p>
              <Interactive3DWrapper
                className="rounded-[3rem] p-8 shadow-2xl transition-all relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--skin-primary)',
                  color: 'var(--primary-foreground, var(--skin-bg))',
                  boxShadow: `0 25px 50px -12px rgba(var(--skin-primary-rgb, 0,0,0), 0.5), inset 0 1px 1px rgba(255,255,255,0.2)`
                }}
              >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl opacity-30" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-3">{gameState.players.p1.name}</p>
                    <div className="relative inline-block mb-3">
                      <p className="text-4xl filter drop-shadow-md">{currentSkin.id === 'default' ? gameState.players.p1.avatar : currentSkin.icons.player1}</p>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 flex items-center justify-center text-[8px]">1</div>
                    </div>
                    <p className="text-2xl font-black tracking-tighter leading-none">{formatCurrency(gameState.players.p1.totalContributed)}</p>
                  </div>

                  <div className="w-[1px] h-16 bg-current opacity-10 rounded-full mx-2" />

                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-3">{gameState.players.p2.name}</p>
                    <div className="relative inline-block mb-3">
                      <p className="text-4xl filter drop-shadow-md">{currentSkin.id === 'default' ? gameState.players.p2.avatar : currentSkin.icons.player2}</p>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 flex items-center justify-center text-[8px]">2</div>
                    </div>
                    <p className="text-2xl font-black tracking-tighter leading-none">{formatCurrency(gameState.players.p2.totalContributed)}</p>
                  </div>
                </div>
              </Interactive3DWrapper>
            </div>

            {/* Latest Draw Data */}
            {latestDrawData && (
              <div className="space-y-3">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest px-2">
                  Resultado deste Mês <span className="opacity-60 font-bold">({latestDrawData.date})</span>
                </p>
                <div className="relative">
                  {/* Decorative Glow */}
                  <div className="absolute -inset-4 bg-[var(--skin-primary)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none" />

                  <Interactive3DWrapper
                    className="rounded-[2.5rem] p-7 shadow-xl border border-white/20 transition-all relative overflow-hidden"
                    style={{
                      background: 'var(--skin-card-bg)',
                      color: 'var(--card-foreground, var(--foreground))',
                      backdropFilter: 'blur(calc(var(--skin-glass) + 5px))',
                      WebkitBackdropFilter: 'blur(calc(var(--skin-glass) + 5px))',
                      boxShadow: `0 15px 35px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.05)`
                    }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                          {currentSkin.id === 'default' ? gameState.players.p1.avatar : currentSkin.icons.player1}
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-[0.15em] opacity-80">{gameState.players.p1.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Soma</p>
                        <span className="font-black px-4 py-2 rounded-2xl text-[13px] backdrop-blur-md border border-white/10 shadow-lg block" style={{ color: 'var(--skin-primary)', background: 'rgba(255,255,255,0.03)' }}>
                          {formatCurrency(latestDrawData.p1Sum)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 mb-8 border-b border-white/5 pb-8">
                      {latestDrawData.p1Numbers.map(n => (
                        <span key={n} className="bg-white/5 dark:bg-white/5 border border-white/10 w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-black shadow-md backdrop-blur-md hover:scale-110 transition-transform cursor-default" style={{ borderColor: 'rgba(var(--skin-primary-rgb, 193, 60, 122), 0.3)' }}>{n}</span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                          {currentSkin.id === 'default' ? gameState.players.p2.avatar : currentSkin.icons.player2}
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-[0.15em] opacity-80">{gameState.players.p2.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Soma</p>
                        <span className="font-black px-4 py-2 rounded-2xl text-[13px] backdrop-blur-md border border-white/10 shadow-lg block" style={{ color: 'var(--skin-accent)', background: 'rgba(255,255,255,0.03)' }}>
                          {formatCurrency(latestDrawData.p2Sum)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {latestDrawData.p2Numbers.map(n => (
                        <span key={n} className="bg-white/5 dark:bg-white/5 border border-white/10 w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-black shadow-md backdrop-blur-md hover:scale-110 transition-transform cursor-default" style={{ borderColor: 'rgba(var(--skin-accent-rgb, 230, 194, 110), 0.3)' }}>{n}</span>
                      ))}
                    </div>
                  </Interactive3DWrapper>
                </div>
              </div>
            )}

            {/* All history */}
            {effectiveHistory.length > 0 && (
              <div className="space-y-3 pb-20">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest px-2 flex items-center gap-2"><Clock size={14} /> Todos os Sorteios</p>
                <div
                  className="rounded-[3rem] p-2 dark:border-white/5 space-y-2"
                >
                  {effectiveHistory.slice(0, 100).map(tx => (
                    <div key={tx.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all mb-2 last:mb-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10 shadow-sm group-hover:scale-105 transition-transform">
                          {tx.playerId === 'p1' ? (currentSkin.id === 'default' ? gameState.players.p1.avatar : currentSkin.icons.player1) : (currentSkin.id === 'default' ? gameState.players.p2.avatar : currentSkin.icons.player2)}
                        </div>
                        <div>
                          <p className="font-black text-[15px] tracking-tight mb-0.5">
                            Número <span style={{ color: tx.playerId === 'p1' ? 'var(--skin-primary)' : 'var(--skin-accent)' }}>{tx.number}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 opacity-60">
                              {tx.type === 'bonus' ? 'Extra' : tx.type === 'extra' ? 'Desafio' : 'Mensal'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.1em] block">{tx.date}</span>
                        <ChevronRight size={14} className="ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: CARTELAS ──────────────────── */}
        {
          activeTab === 'cartelas' && (
            isV2 && gameState.bingoCardsV2 ? (
              <BingoCardsGrid
                cards={gameState.bingoCardsV2}
                playerNames={{ p1: gameState.players.p1.name, p2: gameState.players.p2.name }}
                playerAvatars={{ p1: gameState.players.p1.avatar, p2: gameState.players.p2.avatar }}
                lastDrawnNumber={lastV2DrawnNumber}
                onPrint={() => setShowPrintModal(true)}
                competitiveScore={gameState.competitiveScore}
              />
            ) : (
              <Interactive3DWrapper
                className="p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 transition-all"
                style={{
                  background: 'var(--skin-card-bg)',
                  backdropFilter: 'blur(var(--skin-glass))',
                  WebkitBackdropFilter: 'blur(var(--skin-glass))',
                }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-black text-brand-purple dark:text-brand-gold uppercase tracking-widest">Painel de Cartelas</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{gameState.settings.maxNumber} números totais</p>
                  </div>
                  <button onClick={() => setShowPrintModal(true)} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl hover:bg-slate-200 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm transition-all active:scale-95"><Printer size={14} /> Imprimir</button>
                </div>
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
                  {bingoCards.map(card => (
                    <BingoCardView
                      key={card.id}
                      card={card}
                      playerNames={{ p1: gameState.players.p1.name, p2: gameState.players.p2.name }}
                      playerAvatars={{ p1: gameState.players.p1.avatar, p2: gameState.players.p2.avatar }}
                      lastDrawnNumber={gameState.lastDraw?.number}
                    />
                  ))}
                </div>
              </Interactive3DWrapper>
            )
          )
        }
      </main>

      {/* ─── Bottom Tab Bar ────────────────────── */}
      <BottomTabBar active={activeTab} onChange={setActiveTab} />

      {/* ─── Route Modal ───────────────────────── */}
      {
        showRouteModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
              <div className="bg-slate-50 dark:bg-slate-800 p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 rounded-t-[2.5rem]">
                <button onClick={() => setShowRouteModal(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><ArrowLeft size={20} /></button>
                <h3 className="font-black flex items-center gap-2 text-brand-purple dark:text-brand-gold uppercase tracking-widest text-sm flex-1"><Settings2 size={18} /> Ajuste da Rota</h3>
                <button onClick={() => setShowRouteModal(false)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button onClick={() => setRouteTab('income')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${routeTab === 'income' ? 'text-brand-purple border-b-4 border-brand-purple bg-brand-purple/5' : 'text-slate-500'}`}>Renda</button>
                <button onClick={() => setRouteTab('extra')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${routeTab === 'extra' ? 'text-brand-magenta border-b-4 border-brand-magenta bg-brand-magenta/5' : 'text-slate-500'}`}>Extra</button>
                <button onClick={() => setRouteTab('skins')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${routeTab === 'skins' ? 'text-brand-gold border-b-4 border-brand-gold bg-brand-gold/5' : 'text-slate-500'}`}>Skins</button>
                {!gameState.settings.isPro && (
                  <button onClick={() => setShowPricingModal(true)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all text-brand-gold bg-brand-gold/10 border-b-4 border-brand-gold animate-pulse">🔥 PRO</button>
                )}
              </div>
              <div className="p-8">
                {routeTab === 'income' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{gameState.players.p1.name}</label>
                      <input type="number" value={newP1Income} onChange={e => setNewP1Income(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black focus:border-brand-purple outline-none" placeholder="R$ 0" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{gameState.players.p2.name}</label>
                      <input type="number" value={newP2Income} onChange={e => setNewP2Income(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black focus:border-brand-purple outline-none" placeholder="R$ 0" />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proporção</p>
                      <div className="flex items-center justify-center gap-6">
                        <div><p className="text-lg mb-0.5">{gameState.players.p1.avatar}</p><p className="text-xl font-black text-brand-purple">{100 - liveIncomeRatio}%</p></div>
                        <div className="text-slate-300">⚖️</div>
                        <div><p className="text-lg mb-0.5">{gameState.players.p2.avatar}</p><p className="text-xl font-black text-brand-magenta">{liveIncomeRatio}%</p></div>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full flex overflow-hidden">
                        <div className="h-full bg-brand-purple transition-all duration-300" style={{ width: `${100 - liveIncomeRatio}%` }} />
                        <div className="h-full bg-brand-magenta transition-all duration-300" style={{ width: `${liveIncomeRatio}%` }} />
                      </div>
                    </div>
                    <button onClick={handleUpdateIncome} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl active:scale-95 transition-all">Salvar Alterações</button>
                  </div>
                )}
                {routeTab === 'extra' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Extra Recebido</label>
                      <input type="number" value={extraValue} onChange={e => setExtraValue(e.target.value)} placeholder="R$ 0,00" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5 font-black text-2xl focus:border-brand-magenta outline-none" />
                    </div>
                    <button onClick={handleAddExtraValue} className="w-full py-5 bg-brand-magenta text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">Abater Números <ArrowRight size={20} /></button>
                  </div>
                )}
                {routeTab === 'deadline' && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <span className="text-6xl font-black text-brand-gold tracking-tighter">{newDeadline}</span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mt-1">meses restantes</span>
                    </div>
                    <input type="range" min="1" max="60" value={newDeadline} onChange={(e) => setNewDeadline(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-gold" />
                    <button onClick={handleUpdateDeadline} className="w-full py-5 bg-brand-gold text-brand-purple rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Atualizar Prazo</button>
                  </div>
                )}
                {routeTab === 'skins' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {(Object.keys(SKINS) as SkinType[]).map((skinId) => {
                        const s = SKINS[skinId];
                        const isAcquired = skinId === 'default' || gameState.settings.isPro;
                        const isSelected = gameState.settings.skin === skinId || (!gameState.settings.skin && skinId === 'default');
                        return (
                          <button key={skinId} disabled={!isAcquired} onClick={() => { onUpdateState({ ...gameState, settings: { ...gameState.settings, skin: skinId } }); }}
                            className={`relative p-4 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? 'scale-[1.02] shadow-lg ring-1 ring-offset-2 ring-offset-transparent' : 'hover:bg-black/5 dark:hover:bg-white/5'} ${!isAcquired ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            style={{ borderColor: isSelected ? s.colors.primary : 'transparent', backgroundColor: isSelected ? `${s.colors.primary}10` : 'rgba(128,128,128,0.05)', boxShadow: isSelected ? s.effects.shadow : 'none' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-black/5" style={{ background: s.colors.background, color: s.colors.textMain }}>{s.icons.goal}</div>
                              <div className="text-left">
                                <p className="text-sm font-bold uppercase tracking-wide" style={{ fontFamily: s.fonts.header, color: isSelected ? s.colors.primary : 'inherit', textShadow: isSelected ? '0 0 10px rgba(0,0,0,0.1)' : 'none' }}>{s.name}</p>
                                <div className="flex gap-1.5 mt-1.5">
                                  <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: s.colors.primary }}></div>
                                  <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: s.colors.accent }}></div>
                                  <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: s.colors.background }}></div>
                                </div>
                              </div>
                            </div>
                            {!isAcquired && <Lock size={16} className="text-slate-400" />}
                            {isSelected && <div className="p-1 rounded-full text-white" style={{ backgroundColor: s.colors.primary }}><Check size={12} strokeWidth={4} /></div>}
                          </button>
                        );
                      })}
                    </div>
                    {!gameState.settings.isPro && (<p className="text-[9px] text-center font-bold text-brand-gold uppercase tracking-[0.2em] mt-4 animate-pulse">Skins exclusivas no plano PRO</p>)}
                  </div>
                )}
                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Zona de Perigo</p>
                  <button onClick={() => { if (window.confirm("Isso apagará todo seu progresso local. Tem certeza?")) onReset(); }} className="w-full py-4 border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">Reiniciar Todo o Jogo</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        coachMode && (
          <GeminiCoach
            initialMode={coachMode} p1={gameState.players.p1} p2={gameState.players.p2} progressPercent={progress}
            onClose={() => { setCoachMode(null); setCoachUsedThisSession(false); setIsAnniversaryBonus(false); }}
            onChallengeAccepted={handlePenalty} isPro={gameState.settings.isPro} gameState={gameState}
            onCoachUsed={handleCoachUsed} onPricingOpen={() => { setCoachMode(null); setShowPricingModal(true); }}
            currentSkin={currentSkin} isAnniversaryBonus={isAnniversaryBonus}
          />
        )
      }

      {
        celebrationCard && (
          <BingoCelebration
            card={celebrationCard}
            winnerName={celebrationCard.ownerId === 'p1' ? gameState.players.p1.name : celebrationCard.ownerId === 'p2' ? gameState.players.p2.name : 'Compartilhada'}
            winnerAvatar={celebrationCard.ownerId === 'p1' ? gameState.players.p1.avatar : celebrationCard.ownerId === 'p2' ? gameState.players.p2.avatar : '🤝'}
            suggestedReward={celebrationReward} onClose={() => setCelebrationCard(null)} onRerollReward={() => setCelebrationReward(getRandomReward())}
            onCustomReward={(reward) => {
              const newRewards = [...(gameState.bingoRewards || [])];
              const idx = newRewards.findIndex(r => r.cardId === celebrationCard.id);
              if (idx >= 0) newRewards[idx] = { ...newRewards[idx], reward, isCustom: true };
              onUpdateState({ ...gameState, bingoRewards: newRewards });
              setCelebrationCard(null);
            }}
          />
        )
      }

      {
        showPrintModal && (
          <PrintView
            maxNumber={gameState.settings.maxNumber}
            numberOwners={numberOwners}
            onClose={() => setShowPrintModal(false)}
            bingoCardsV2={gameState.bingoCardsV2}
            playerNames={{ p1: gameState.players.p1.name, p2: gameState.players.p2.name }}
            playerAvatars={{ p1: gameState.players.p1.avatar, p2: gameState.players.p2.avatar }}
          />
        )
      }

      {
        !gameState.settings.isPro && (
          <button onClick={() => setShowSalesPage(true)} className="fixed bottom-20 right-6 z-30 flex items-center gap-2 bg-gradient-to-r from-brand-gold to-[#c9a75e] text-brand-purple px-5 py-3 rounded-full shadow-lg shadow-brand-gold/30 hover:scale-105 active:scale-95 transition-all">
            <Crown size={16} className="fill-current" />
            <span className="text-xs font-black uppercase tracking-widest">PRO</span>
          </button>
        )
      }

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
      {showSalesPage && <SalesPage onClose={() => setShowSalesPage(false)} />}
    </div >
  );
};

export default Dashboard;
