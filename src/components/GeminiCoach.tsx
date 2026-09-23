import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Trophy, X, Loader2, RefreshCw, AlertCircle, Clock, TrendingDown, Lock, Coins, Heart, CheckCircle, HelpCircle, Gift, TrendingUp, Zap, ArrowRight, Star, Share2 } from 'lucide-react';
import { getIncentive, getChallenge, getPrediction } from "../services/geminiService";
import { AiIncentive, AiChallenge, AiPrediction } from "../services/aiTypes";
import { Player, GameState } from '../types';

interface GeminiCoachProps {
  initialMode: 'incentive' | 'challenge' | 'prediction';
  p1: Player;
  p2: Player;
  progressPercent: number;
  onClose: () => void;
  onChallengeAccepted: (loserId: 'p1' | 'p2') => number | void;
  isPro?: boolean;
  gameState?: GameState;
  onCoachUsed?: () => void;
  onPricingOpen?: () => void;
  currentSkin?: any;
  isAnniversaryBonus?: boolean;
}

const GeminiCoach: React.FC<GeminiCoachProps> = ({
  initialMode, p1, p2, progressPercent, onClose, onChallengeAccepted, isPro, gameState, onCoachUsed, onPricingOpen, currentSkin, isAnniversaryBonus
}) => {
  // Load seen challenges from localStorage to prevent repetition
  const [seenChallenges, setSeenChallenges] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bingo_seen_challenges');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingLong, setLoadingLong] = useState(false);
  const fetchingRef = useRef(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [incentive, setIncentive] = useState<AiIncentive | null>(null);
  const [challenge, setChallenge] = useState<AiChallenge | null>(null);
  const [prediction, setPrediction] = useState<AiPrediction | null>(null);

  const [mode, setMode] = useState<'incentive' | 'challenge' | 'prediction'>(initialMode);
  const [selectedLoserId, setSelectedLoserId] = useState<'p1' | 'p2' | null>(null);
  const [penaltyResult, setPenaltyResult] = useState<{ loser: string, number: number } | null>(null);
  const [taskConfirmed, setTaskConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usage Limit Check - driven by backend response
  const FREE_LIMIT = 3;
  const [usageCount, setUsageCount] = useState<number>(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = gameState?.retention?.coachUsage;
    return (usage && usage.lastUsageMonth === currentMonth) ? usage.count : 0;
  });
  const [isLimitReached, setIsLimitReached] = useState(false);


  // Load seen incentives
  const [seenIncentives, setSeenIncentives] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bingo_seen_incentives');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Session cache to avoid re-fetching
  const [cache, setCache] = useState<Record<string, any>>({});

  const handleFetchData = async (targetMode: 'incentive' | 'challenge' | 'prediction', forceRefresh = false) => {
    if (isLimitReached) {
      setMode(targetMode);
      return;
    }

    // Synchronous guard to prevent concurrent fetches
    if (fetchingRef.current) return;

    // Use cached data if available (instant tab switch)
    if (!forceRefresh && cache[targetMode]) {
      setMode(targetMode);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setLoadingLong(false);
    setError(null);
    setMode(targetMode);

    // Progressive loading message after 5s
    loadingTimerRef.current = setTimeout(() => setLoadingLong(true), 5000);

    try {
      if (targetMode === 'incentive') {
        const contextData = {
          totalGoal: gameState?.settings?.totalBingoGoal || 0,
          deadlineMonths: gameState?.settings?.deadlineMonths || 12,
          totalNumbers: gameState?.settings?.maxNumber || 200,
          avgValue: (gameState?.settings?.totalBingoGoal || 0) / (gameState?.settings?.maxNumber || 200),
          progressPercent,
          remainingNumbers: gameState?.availableNumbers?.length || 0,
          objective: gameState?.settings?.goalCategory || 'Meta do Casal'
        };
        const data: any = await getIncentive(p1.name, p2.name, contextData, seenIncentives, isAnniversaryBonus, currentSkin?.id);
        console.log('[Coach] incentive response:', JSON.stringify({ usageCount: data.usageCount, _limitReached: data._limitReached }));

        if (data._limitReached) {
          setUsageCount(data.usageCount || FREE_LIMIT);
          setIsLimitReached(true);
          return;
        }
        if (data.usageCount !== undefined) setUsageCount(data.usageCount);

        const newHistory = [...seenIncentives, data.title].slice(-20);
        setSeenIncentives(newHistory);
        localStorage.setItem('bingo_seen_incentives', JSON.stringify(newHistory));

        setIncentive(data);
        setCache(prev => ({ ...prev, incentive: data }));
        // Save full tip for inline dashboard preview (all fields)
        try { localStorage.setItem('bingo_last_tip_preview', JSON.stringify({ title: data.title, practicalTip: data.practicalTip, bingoImpact: data.bingoImpact, timeImpact: data.timeImpact })); } catch { }
        onCoachUsed?.();
      } else if (targetMode === 'challenge') {
        setSelectedLoserId(null);
        setPenaltyResult(null);
        setTaskConfirmed(false);

        const data: any = await getChallenge(p1.name, p2.name, seenChallenges, isAnniversaryBonus, currentSkin?.id);
        console.log('[Coach] challenge response:', JSON.stringify({ usageCount: data.usageCount, _limitReached: data._limitReached }));

        if (data._limitReached) {
          setUsageCount(data.usageCount || FREE_LIMIT);
          setIsLimitReached(true);
          return;
        }
        if (data.usageCount !== undefined) setUsageCount(data.usageCount);

        const newHistory = [...seenChallenges, data.title].slice(-20);
        setSeenChallenges(newHistory);
        localStorage.setItem('bingo_seen_challenges', JSON.stringify(newHistory));

        setChallenge(data);
        setCache(prev => ({ ...prev, challenge: data }));
        onCoachUsed?.();
      } else if (targetMode === 'prediction' && isPro) {
        const context = {
          totalGoal: gameState?.settings?.totalBingoGoal || 0,
          currentSaved: (gameState?.drawnNumbers || []).reduce((a: number, b: number) => a + b, 0),
          monthsElapsed: 1
        };
        const data = await getPrediction(p1.name, p2.name, gameState?.history || [], context);
        setPrediction(data);
        setCache(prev => ({ ...prev, prediction: data }));
        onCoachUsed?.();
      }
    } catch (err) {
      console.error("AI Coach Error:", err);
      setError("Não foi possível conectar ao Oráculo. Tente novamente em instantes.");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingLong(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
  };

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    handleFetchData(initialMode);
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectLoser = (loserId: 'p1' | 'p2') => setSelectedLoserId(loserId);

  const handleChooseFinancial = () => {
    if (!selectedLoserId) return;
    const number = onChallengeAccepted(selectedLoserId);
    if (typeof number === 'number') {
      const loserName = selectedLoserId === 'p1' ? p1.name : p2.name;
      setPenaltyResult({ loser: loserName, number });
    }
  };

  const handleChooseTask = () => setTaskConfirmed(true);

  const loserName = selectedLoserId === 'p1' ? p1.name : p2.name;
  const loserAvatar = (currentSkin && currentSkin.id !== 'default')
    ? (selectedLoserId === 'p1' ? currentSkin.icons.player1 : currentSkin.icons.player2)
    : (selectedLoserId === 'p1' ? p1.avatar : p2.avatar);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        {(() => {
          // Detect light skins for text contrast
          const isLightSkin = currentSkin?.id === 'matrimoney';
          const headerText = isLightSkin ? 'text-slate-900' : 'text-white';
          const inactiveTabText = isLightSkin ? 'text-slate-500' : 'text-white/60';
          const activeTabText = isLightSkin ? 'text-slate-900' : 'text-indigo-600';
          const closeHover = isLightSkin ? 'hover:bg-black/10' : 'hover:bg-white/20';
          const tabBg = isLightSkin ? 'bg-black/5' : 'bg-white/10';

          return (
            <div className={`p-4 flex flex-col gap-3 ${headerText} ${currentSkin?.id === 'default' ? 'bg-gradient-to-r from-indigo-500 to-blue-600' : ''}`} style={currentSkin?.id !== 'default' ? { backgroundColor: 'var(--skin-primary)' } : {}}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {currentSkin && currentSkin.id !== 'default' && currentSkin.icons?.goal ? (
                    <span className="text-xl leading-none drop-shadow-sm">{currentSkin.icons.goal}</span>
                  ) : (
                    <Sparkles className={`w-5 h-5 ${isLightSkin ? 'text-amber-600' : 'text-yellow-300'}`} />
                  )}
                  <h3 className="font-bold tracking-wide">Oráculo {currentSkin?.id !== 'default' ? 'VIP' : 'de IA'}</h3>
                </div>
                <button onClick={onClose} className={`${closeHover} p-1 rounded-full transition-colors`}>
                  <X size={20} />
                </button>
              </div>
              <div className={`flex ${tabBg} p-1 rounded-xl`}>
                <button disabled={loading} onClick={() => handleFetchData('incentive')} className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${mode === 'incentive' ? `bg-white ${activeTabText} shadow-sm` : inactiveTabText} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>Dica</button>
                <button disabled={loading} onClick={() => handleFetchData('challenge')} className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${mode === 'challenge' ? `bg-white ${activeTabText} shadow-sm` : inactiveTabText} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>Desafio</button>
                <button disabled={loading} onClick={() => handleFetchData('prediction')} className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${mode === 'prediction' ? `bg-white ${activeTabText} shadow-sm` : inactiveTabText} flex items-center justify-center gap-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  Previsão <Lock size={8} className={isPro ? 'hidden' : ''} />
                </button>
              </div>
            </div>
          );
        })()}

        {!isPro && !isLimitReached && (
          <div className="px-4 py-2 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {Math.max(0, (isAnniversaryBonus ? FREE_LIMIT + 1 : FREE_LIMIT) - usageCount)} de {isAnniversaryBonus ? FREE_LIMIT + 1 : FREE_LIMIT} usos restantes
              </span>
            </div>
            <button onClick={onPricingOpen} className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider hover:underline">
              Seja PRO →
            </button>
          </div>
        )}

        <div className="p-6 max-h-[60vh] overflow-y-auto flex flex-col text-slate-800 dark:text-slate-100">
          {isLimitReached ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center relative">
                <Lock className="text-brand-gold" size={40} />
                <Star className="absolute -top-1 -right-1 text-brand-gold animate-bounce" size={20} fill="currentColor" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase leading-tight">Limite Mensal Atingido!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium px-4">Usuários Free têm 3 consultas por mês. No modo **PRO**, o Oráculo é ilimitado e muito mais preciso.</p>
              </div>

              <div className="w-full space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 text-left">
                  <Zap size={18} className="text-brand-gold" />
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Consultas ilimitadas e sem esperas</p>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <TrendingUp size={18} className="text-indigo-500" />
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Previsões baseadas no seu histórico real</p>
                </div>
              </div>

              <button
                onClick={onPricingOpen}
                className="w-full py-4 text-white rounded-2xl font-black shadow-lg shadow-black/10 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, var(--skin-primary) 0%, var(--skin-accent) 100%)' }}
              >
                SEJA PRO AGORA <ArrowRight size={18} />
              </button>
              <button onClick={onClose} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Talvez mais tarde</button>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center">
                <AlertCircle className="text-rose-500" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Conexão Interrompida</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 px-4">{error}</p>
              </div>
              <button
                onClick={() => handleFetchData(mode)}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <RefreshCw size={14} /> Tentar Novamente
              </button>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                {loadingLong ? 'Quase lá... O oráculo está pensando!' : 'Consultando oráculo financeiro...'}
              </p>
              {loadingLong && (
                <button
                  onClick={() => {
                    fetchingRef.current = false;
                    setLoading(false);
                    setLoadingLong(false);
                    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
                    setError('O oráculo demorou demais. Toque em "Tentar Novamente".');
                  }}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          ) : penaltyResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
              <div className="w-24 h-24 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 border-4 border-rose-100 dark:border-rose-900 mb-2">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Prenda Sorteada!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sua escolha, <b>{penaltyResult.loser}</b>!</p>
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl w-full border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Você deve pagar o número:</p>
                <p className="text-6xl font-black text-slate-800 dark:text-slate-100">{penaltyResult.number}</p>
              </div>
              <button onClick={onClose} className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-bold mt-4 shadow-xl">Entendido!</button>
            </div>
          ) : taskConfirmed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
              <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 border-4 border-green-100 dark:border-green-900 mb-2">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Compromisso Feito!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Boa escolha, <b>{loserName}</b>!</p>
              <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-green-200 dark:border-green-800 p-6 rounded-2xl w-full relative overflow-hidden shadow-sm">
                <p className="text-[10px] text-green-500 font-black uppercase mb-2 relative z-10 tracking-widest">Sua Missão é:</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight relative z-10">"{challenge?.taskOption}"</p>
              </div>
              <button onClick={onClose} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold mt-4 shadow-xl">Vou cumprir!</button>
            </div>
          ) : (
            <>
              {mode === 'incentive' && incentive && (
                <div className="flex flex-col h-full justify-between animate-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">Dica Prática</span>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 leading-tight">{incentive.title}</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">{incentive.practicalTip}</div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl"><p className="text-[10px] font-bold text-green-600 uppercase">Bingo</p><p className="text-xs font-bold">{incentive.bingoImpact}</p></div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl"><p className="text-[10px] font-bold text-blue-600 uppercase">Tempo</p><p className="text-xs font-bold">{incentive.timeImpact}</p></div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <button
                      onClick={() => {
                        const text = `💡 Dica do Bingo2Gether: ${incentive.title}\n\n${incentive.practicalTip}\n\n📲 Marque @bingo2gether nos Stories!\n🎯 bingo2gether.app`;
                        navigator.clipboard.writeText(text).then(() => {
                          window.open('https://www.instagram.com/bingo2gether/', '_blank');
                          alert('Texto copiado! Cole no seu Story do Instagram e marque @bingo2gether 📸');
                        }).catch(() => {
                          if (navigator.share) {
                            navigator.share({ text }).catch(() => { });
                          }
                        });
                      }}
                      className="w-full py-3 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, var(--skin-accent) 0%, var(--skin-primary) 100%)' }}
                    >
                      <Share2 size={16} /> Compartilhar no Instagram
                    </button>
                    <div className="flex gap-2">
                      <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm">Fechar</button>
                      <button
                        onClick={() => { setCache(prev => { const c = { ...prev }; delete c.incentive; return c; }); handleFetchData('incentive', true); }}
                        disabled={loading}
                        className="py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={14} /> Gerar Novo
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {mode === 'challenge' && challenge && (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                  {!selectedLoserId ? (
                    <div className="flex-1 space-y-4">
                      <h4 className="text-2xl font-black text-center text-slate-800 dark:text-slate-100 mt-2">{challenge.title}</h4>
                      <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 space-y-3 font-medium text-sm">
                        <p><span className="text-[10px] font-bold text-rose-400 uppercase block">Descrição</span> {challenge.description}</p>
                        <p><span className="text-[10px] font-bold text-rose-400 uppercase block">Vitória</span> {challenge.victoryCriteria}</p>
                      </div>
                      {/* Regra de Ouro */}
                      <div className="bg-amber-50/80 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40">
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">⚖️ Regra de Ouro</p>
                        <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                          Se o casal não chegar a um vencedor ou o desafio gerar discórdia, ambos pagam a prenda ou sorteiam um novo número.
                        </p>
                      </div>
                      {/* Share + Instagram suggestion */}
                      <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl border border-pink-200 dark:border-pink-800/40">
                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-wider mb-1">📸 Dica de Engajamento</p>
                        <p className="text-xs text-pink-700 dark:text-pink-300 font-medium leading-relaxed">
                          Poste nos Stories e marque <span className="font-black text-pink-500">@bingo2gether</span>! Faça uma enquete para decidir o vencedor! Quem perder paga a prenda 😏
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const text = `🥊 Desafio do Bingo2Gether: ${challenge.title}\n\n${challenge.description}\n\nQuem vai ganhar? ${p1.name} ou ${p2.name}? Vota lá no story! 🗳️\n\n📲 Marque @bingo2gether nos Stories!\n🎯 bingo2gether.app`;
                          navigator.clipboard.writeText(text).then(() => {
                            window.open('https://www.instagram.com/bingo2gether/', '_blank');
                            alert('Texto copiado! Cole no seu Story do Instagram e marque @bingo2gether 📸');
                          }).catch(() => {
                            if (navigator.share) {
                              navigator.share({ text }).catch(() => { });
                            }
                          });
                        }}
                        className="w-full py-3 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, var(--skin-accent) 0%, var(--skin-primary) 100%)' }}
                      >
                        <Share2 size={16} /> Compartilhar no Instagram
                      </button>
                      <button
                        onClick={() => { setCache(prev => { const c = { ...prev }; delete c.challenge; return c; }); handleFetchData('challenge', true); }}
                        disabled={loading}
                        className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={12} /> Gerar Novo Desafio
                      </button>
                      <div className="mt-4">
                        <p className="text-center text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Quem perdeu?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleSelectLoser('p1')} className="p-3 rounded-xl border-2 hover:border-rose-400 font-bold transition-all">
                            {(currentSkin && currentSkin.id !== 'default') ? currentSkin.icons.player1 : p1.avatar} {p1.name}
                          </button>
                          <button onClick={() => handleSelectLoser('p2')} className="p-3 rounded-xl border-2 hover:border-rose-400 font-bold transition-all">
                            {(currentSkin && currentSkin.id !== 'default') ? currentSkin.icons.player2 : p2.avatar} {p2.name}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto text-4xl flex items-center justify-center mb-2 border-2 transition-transform hover:scale-110">{loserAvatar}</div>
                        <h3 className="text-xl font-black">{loserName} perdeu!</h3>
                      </div>
                      <div className="space-y-4">
                        <button onClick={handleChooseFinancial} className="w-full bg-white dark:bg-slate-800 border-2 p-4 rounded-2xl flex items-center gap-4 transition-all group overflow-hidden relative hover:scale-[1.01]" style={{ borderColor: 'var(--skin-primary)' }}>
                          <Coins className="group-hover:scale-110 transition-transform" style={{ color: 'var(--skin-primary)' }} />
                          <div className="text-left"><p className="text-[10px] font-black uppercase" style={{ color: 'var(--skin-primary)' }}>Opção Financeira</p><p className="text-sm font-bold">Sortear Número Misterioso</p></div>
                        </button>
                        <button onClick={handleChooseTask} className="w-full bg-white dark:bg-slate-800 border-2 p-4 rounded-2xl flex items-center gap-4 transition-all group overflow-hidden relative hover:scale-[1.01]" style={{ borderColor: 'var(--skin-accent)' }}>
                          <Gift className="group-hover:scale-110 transition-transform" style={{ color: 'var(--skin-accent)' }} />
                          <div className="text-left"><p className="text-[10px] font-black uppercase" style={{ color: 'var(--skin-accent)' }}>Opção Prenda</p><p className="text-sm font-bold">Prenda Surpresa</p></div>
                        </button>
                      </div>
                      <button onClick={() => setSelectedLoserId(null)} className="mt-auto py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Voltar</button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'prediction' && (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                  {!isPro ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-6">
                      <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center">
                        <Lock className="text-brand-gold" size={32} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black uppercase">Oráculo Preditivo</h4>
                        <p className="text-sm text-slate-500 mt-2 px-2">Analisamos seu ritmo de economia para projetar exatamente quando o sonho será realizado.</p>
                      </div>

                      <div className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 opacity-60 grayscale blur-[1px]">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                        <div className="h-8 w-full bg-slate-100 dark:bg-slate-600 rounded"></div>
                      </div>

                      <button
                        onClick={onPricingOpen}
                        className="w-full py-4 bg-brand-gold text-white rounded-2xl font-black shadow-lg shadow-brand-gold/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        DESBLOQUEAR TUDO
                      </button>
                    </div>
                  ) : prediction ? (
                    <div className="space-y-4 text-left overflow-y-auto max-h-[450px] pr-1">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Previsão de Conclusão</p>
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{prediction.likelyFinishDate}</p>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className="text-emerald-500" />
                          <p className="text-[10px] font-black text-emerald-600 uppercase">Otimização de Rentabilidade</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Rendimento Estimado</p>
                            <p className="text-sm font-black text-emerald-600">{prediction.investmentRoiEstimate}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Tempo Reduzido</p>
                            <p className="text-sm font-black text-indigo-600">{prediction.timeReductionWithInvestment}</p>
                          </div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                          *Projeção baseada em investimento de 100% do CDI sobre o montante acumulado.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de Ritmo</p>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">{prediction.paceAnalysis}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-xl flex flex-col gap-1">
                            <span className="text-green-600">Otimista</span>
                            <span className="text-slate-700 dark:text-slate-300">{prediction.optimisticScenario}</span>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-xl flex flex-col gap-1">
                            <span className="text-rose-600">Conservador</span>
                            <span className="text-slate-700 dark:text-slate-300">{prediction.pessimisticScenario}</span>
                          </div>
                        </div>

                        <div className="bg-brand-gold/5 p-4 rounded-2xl border-2 border-brand-gold/10 mt-2 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                            <Trophy size={40} className="text-brand-gold" />
                          </div>
                          <p className="text-[9px] font-black text-brand-gold uppercase tracking-widest mb-1">Dica do Juiz</p>
                          <p className="text-[11px] font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed relative z-10">"{prediction.recommendation}"</p>
                        </div>
                      </div>
                      <button onClick={onClose} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black mt-4 shadow-xl active:scale-95 transition-all">ESTOU NO CAMINHO!</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                      <p className="text-xs font-bold text-slate-400 uppercase">Gerando projeção...</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiCoach;