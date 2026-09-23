import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Player } from '../types';
import { calculateTotalPot, calculateMonthlyTarget, formatCurrency, calculateIncomeRatio, findNumbersForExtraValue } from '../services/gameLogic';
import { generateBingoCardsV2, syncCardsWithDrawnNumbers } from '../services/bingoCardService';
import { MIN_NUMBER, MAX_NUMBER_LIMIT, AVATARS } from '../constants';
import {
    Heart, Plane, Car, Home, Gem, Target, ArrowRight, ShieldCheck,
    Scale, Sparkles, Zap, ChevronLeft, Lock, Star,
    Briefcase, Coins, PiggyBank, Smartphone, Sun, Palette, Check, Crown, CalendarHeart
} from 'lucide-react';
import { SKINS, SkinType } from '../skins';

interface OnboardingProps {
    onComplete: (setupData: Partial<GameState>) => void;
    isPro?: boolean;
    onStepChange?: (step: number) => void;
}

export const BingoLogo = ({ className = "w-40 h-40" }: { className?: string }) => {
    return (
        <img
            src="/logo.png"
            className={`${className} object-contain drop-shadow-2xl rounded-3xl`}
            alt="Bingo2Gether Logo"
        />
    );
};

const INITIAL_MAX_NUMBER = 200;

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isPro = false, onStepChange }) => {
    const [step, setStep] = useState(1);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        onStepChange?.(step);
    }, [step, onStepChange]);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const [setup, setSetup] = useState({
        p1Name: 'Amor 1',
        p1Avatar: '🦁',
        p2Name: 'Amor 2',
        p2Avatar: '🦊',
        goal: 'other',
        maxNumber: INITIAL_MAX_NUMBER,
        deadlineMonths: 12,
        initialInvestment: '',
        p1Income: '',
        p2Income: '',
        incomeSplit: 50,
        calcMode: 'auto' as 'auto' | 'manual',
        ritualDay: 0,
        skin: 'default' as SkinType,
        customGoal: '',
        coupleDate: '',
    });

    const totalBingo = calculateTotalPot(setup.maxNumber);
    const monthlyAmount = totalBingo / setup.deadlineMonths;

    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting("Bom dia");
        else if (hour >= 12 && hour < 18) setGreeting("Boa tarde");
        else setGreeting("Boa noite");
    }, []);

    useEffect(() => {
        if (setup.calcMode === 'manual') return;

        const inc1 = parseFloat(setup.p1Income) || 0;
        const inc2 = parseFloat(setup.p2Income) || 0;
        if (inc1 > 0 || inc2 > 0) {
            const ratio = calculateIncomeRatio(inc1, inc2);
            setSetup(prev => ({ ...prev, incomeSplit: ratio }));
        } else {
            setSetup(prev => ({ ...prev, incomeSplit: 50 }));
        }
    }, [setup.p1Income, setup.p2Income, setup.calcMode]);

    const handleFocus = (player: 'p1' | 'p2', currentVal: string, defaultVal: string) => {
        if (currentVal === defaultVal) {
            if (player === 'p1') {
                setSetup(prev => ({ ...prev, p1Name: '' }));
            } else {
                setSetup(prev => ({ ...prev, p2Name: '' }));
            }
        }
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => {
        if (step === 6 && setup.calcMode === 'manual') {
            setStep(4);
        } else {
            setStep(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        setTransitioning(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setLoadingProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                completeSetup();
            }
        }, 150);
    };

    const completeSetup = () => {
        const p1: Player = {
            id: 'p1', name: setup.p1Name || 'Amor 1', avatar: setup.p1Avatar,
            incomeShare: 100 - setup.incomeSplit,
            estimatedIncome: parseFloat(setup.p1Income) || 0,
            totalContributed: 0
        };
        const p2: Player = {
            id: 'p2', name: setup.p2Name || 'Amor 2', avatar: setup.p2Avatar,
            incomeShare: setup.incomeSplit,
            estimatedIncome: parseFloat(setup.p2Income) || 0,
            totalContributed: 0
        };

        const allNumbers = Array.from({ length: setup.maxNumber }, (_, i) => i + 1);

        // Pre-mark numbers if there's an initial investment
        const initialAmount = parseFloat(setup.initialInvestment) || 0;
        let availableNumbers = [...allNumbers];
        let drawnNumbers: number[] = [];

        if (initialAmount > 0) {
            const { numbers: preMarked } = findNumbersForExtraValue(availableNumbers, initialAmount);
            drawnNumbers = preMarked;
            availableNumbers = availableNumbers.filter(n => !preMarked.includes(n));
        }

        const setupData: Partial<GameState> = {
            isSetup: true,
            settings: {
                goalCategory: setup.goal,
                customGoalName: setup.goal === 'other' ? setup.customGoal : '',
                maxNumber: setup.maxNumber,
                targetDate: new Date().toISOString(),
                startDate: new Date().toISOString(),
                deadlineMonths: setup.deadlineMonths,
                initialInvestment: initialAmount,
                monthlyTarget: calculateMonthlyTarget(availableNumbers.length, setup.deadlineMonths),
                totalBingoGoal: totalBingo,
                currencySymbol: 'R$',
                notificationMode: 'manual',
                notificationDay: 5,
                skin: (setup.goal === 'marriage' && isPro) ? 'matrimoney' : (setup.goal === 'travel' && isPro) ? 'viagem' : setup.skin,
                isPro,
                ritualDay: setup.ritualDay,
                coupleAnniversary: setup.coupleDate || undefined,
                lastDraw: null
            } as any,
            players: { p1, p2 },
            availableNumbers,
            drawnNumbers,
            history: drawnNumbers.map((num, i) => ({
                id: `initial-${i}`,
                number: num,
                playerId: 'p1' as const,
                date: new Date().toISOString(),
                type: 'extra' as const,
                timestamp: Date.now(),
            })),
            lastDraw: null,
            retention: {
                coupleStreak: 0,
                lastPlayDate: null,
                survivalMode: false,
                lastActivityDate: new Date().toISOString()
            },
            interactiveBingoV2: true,
            bingoCardsV2: syncCardsWithDrawnNumbers(generateBingoCardsV2(setup.maxNumber), drawnNumbers),
            bingoRewards: [],
            competitiveScore: { p1: 0, p2: 0 },
        };
        onComplete(setupData);
    };

    const goalIcons = [
        { id: 'marriage', icon: <Gem size={24} />, label: 'Matrimoney', isPremium: true },
        { id: 'travel', icon: <Plane size={24} />, label: 'Viagem', isPremium: true },
        { id: 'house', icon: <Home size={24} />, label: 'Casa Própria' },
        { id: 'car', icon: <Car size={24} />, label: 'Carro' },
        { id: 'mobile', icon: <Smartphone size={24} />, label: 'Celular' },
        { id: 'other', icon: <Target size={24} />, label: 'Outro' },
    ];

    const totalSteps = 7;

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden relative selection:bg-brand-magenta/20 selection:text-brand-purple transition-colors duration-500">
            {/* Video Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <video
                    src="/splash.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay dark:opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white/90 dark:from-slate-950/90 dark:via-slate-950/80 dark:to-slate-950/90 backdrop-blur-[2px]"></div>
            </div>
            <AnimatePresence>
                {transitioning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
                    >
                        <div className="mb-8 scale-150 animate-bounce">
                            <BingoLogo />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-purple to-brand-magenta dark:from-brand-gold dark:to-brand-gold/60 tracking-tight drop-shadow-sm mb-12">
                            Bingo2Gether
                        </h1>
                        <div className="w-64 space-y-2">
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-brand-purple via-brand-magenta to-brand-gold"
                                    style={{ width: `${loadingProgress}%` }}
                                />
                            </div>
                            <p className="text-center text-xs text-brand-purple dark:text-brand-gold font-bold animate-pulse">
                                {loadingProgress < 30 && "Configurando metas..."}
                                {loadingProgress >= 30 && loadingProgress < 70 && "Calculando probabilidades..."}
                                {loadingProgress >= 70 && "Preparando cartelas..."}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col p-6">
                <header className="flex items-center justify-between mb-6">
                    {step > 1 && !transitioning && (
                        <button onClick={handleBack} className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm text-slate-400 hover:text-slate-600">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {!transitioning && (
                        <div className="flex-1 mx-4 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-brand-purple to-brand-magenta"
                                style={{ width: `${(step / totalSteps) * 100}%` }}
                            />
                        </div>
                    )}
                </header>

                <main className="flex-1 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center space-y-8"
                            >
                                <div className="flex justify-center scale-110 mb-4">
                                    <BingoLogo />
                                </div>
                                <div>
                                    <p className="text-brand-purple dark:text-brand-gold font-black text-sm uppercase tracking-widest mb-2">{greeting}</p>
                                    <h1 className="text-4xl font-black text-brand-purple dark:text-white tracking-tight">Bingo2Gether</h1>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em]">Construindo o futuro a dois</p>
                                </div>
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <select
                                                value={setup.p1Avatar}
                                                onChange={e => setSetup({ ...setup, p1Avatar: e.target.value })}
                                                className="w-full text-4xl bg-transparent border-none focus:ring-0 text-center"
                                            >
                                                {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                            <input
                                                value={setup.p1Name}
                                                onFocus={() => handleFocus('p1', setup.p1Name, 'Amor 1')}
                                                onChange={e => setSetup({ ...setup, p1Name: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 p-2 text-center text-sm font-bold rounded-t-lg"
                                            />
                                        </div>
                                        <div className="flex items-center text-slate-300 font-black">&</div>
                                        <div className="flex-1 space-y-2">
                                            <select
                                                value={setup.p2Avatar}
                                                onChange={e => setSetup({ ...setup, p2Avatar: e.target.value })}
                                                className="w-full text-4xl bg-transparent border-none focus:ring-0 text-center"
                                            >
                                                {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                            <input
                                                value={setup.p2Name}
                                                onFocus={() => handleFocus('p2', setup.p2Name, 'Amor 2')}
                                                onChange={e => setSetup({ ...setup, p2Name: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 p-2 text-center text-sm font-bold rounded-t-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleNext} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2">
                                    Nossa Jornada Começa <ArrowRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" className="space-y-6">
                                <h2 className="text-3xl font-black text-center">Qual o objetivo?</h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {goalIcons.map(g => (
                                        <button
                                            key={g.id}
                                            disabled={g.isPremium && !isPro}
                                            onClick={() => setSetup({ ...setup, goal: g.id })}
                                            className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all relative ${setup.goal === g.id ? 'border-brand-magenta bg-brand-magenta/5 text-brand-magenta' : 'border-transparent bg-white dark:bg-slate-900 text-slate-400'} ${g.isPremium && !isPro ? 'grayscale opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                                        >
                                            <div className="relative">
                                                {g.icon}
                                                {g.isPremium && !isPro && <Lock size={12} className="absolute -top-1 -right-1 text-brand-gold bg-slate-900 rounded-full p-0.5" />}
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest">{g.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {setup.goal === 'other' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800"
                                    >
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Sua meta personalizada</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Reserva de Emergência"
                                            value={setup.customGoal}
                                            onChange={e => setSetup({ ...setup, customGoal: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold focus:ring-2 focus:ring-brand-purple outline-none"
                                        />
                                    </motion.div>
                                )}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-6 text-center">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bingo de</p>
                                        <h3 className="text-6xl font-black text-brand-purple dark:text-white tracking-tighter">{setup.maxNumber}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Números</p>
                                    </div>
                                    <input
                                        type="range" min={MIN_NUMBER} max={MAX_NUMBER_LIMIT} step={30}
                                        value={setup.maxNumber} onChange={e => setSetup({ ...setup, maxNumber: Number(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none accent-brand-purple"
                                    />
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Meta Final:</span>
                                        <span className="text-2xl font-black text-brand-magenta">{formatCurrency(totalBingo)}</span>
                                    </div>
                                </div>

                                {/* Valor já guardado */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800"
                                >
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">
                                        💰 Já tem algum valor guardado?
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="R$ 0,00 (opcional)"
                                        value={setup.initialInvestment}
                                        onChange={e => setSetup({ ...setup, initialInvestment: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-black focus:ring-2 focus:ring-brand-purple outline-none"
                                    />
                                    {parseFloat(setup.initialInvestment) > 0 && (
                                        <p className="text-[10px] text-brand-purple dark:text-brand-gold font-bold mt-2 ml-1">
                                            ✅ Vamos riscar números equivalentes a {formatCurrency(parseFloat(setup.initialInvestment))} ao iniciar!
                                        </p>
                                    )}
                                </motion.div>
                                <button onClick={handleNext} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black text-lg">Próximo</button>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" className="space-y-8 text-center">
                                <h2 className="text-3xl font-black">Em quanto tempo?</h2>
                                <div className="py-8">
                                    <span className="text-8xl font-black text-brand-purple dark:text-brand-gold">{setup.deadlineMonths}</span>
                                    <span className="block text-slate-400 font-black uppercase tracking-widest">meses</span>
                                </div>
                                <input
                                    type="range" min={1} max={60} step={1}
                                    value={setup.deadlineMonths} onChange={e => setSetup({ ...setup, deadlineMonths: Number(e.target.value) })}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none accent-brand-magenta"
                                />
                                <div className="bg-brand-purple/5 p-6 rounded-3xl">
                                    <p className="text-[10px] font-black text-brand-purple/60 uppercase tracking-widest mb-1">Parcela Mensal Sugerida</p>
                                    <p className="text-4xl font-black text-brand-purple">{formatCurrency(monthlyAmount)}</p>
                                </div>
                                <button onClick={handleNext} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black text-lg">Continuar</button>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" className="space-y-8 text-center">
                                <div className="inline-block p-6 bg-brand-gold/10 rounded-[2.5rem]">
                                    <ShieldCheck className="w-16 h-16 text-brand-gold" />
                                </div>
                                <h2 className="text-3xl font-black">Divisão Justa</h2>
                                <div className="space-y-4">
                                    <button onClick={() => { setSetup({ ...setup, calcMode: 'manual', incomeSplit: 50 }); setStep(prev => prev + 2); }} className="w-full p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 rounded-[2.5rem] text-left hover:border-brand-purple shadow-sm">
                                        <p className="font-black text-lg uppercase tracking-tight">50/50 Igualitário</p>
                                        <p className="text-xs text-slate-400 font-medium">Dividimos tudo ao meio. (Pula etapa de renda)</p>
                                    </button>
                                    <button onClick={() => { setSetup({ ...setup, calcMode: 'auto' }); handleNext(); }} className="w-full p-8 bg-white dark:bg-slate-900 border-2 border-brand-gold/20 rounded-[2.5rem] text-left hover:border-brand-gold shadow-sm">
                                        <p className="font-black text-lg text-brand-purple uppercase tracking-tight">Proporcional à Renda</p>
                                        <p className="text-xs text-slate-400 font-medium">Quem ganha mais contribui com mais (Equidade).</p>
                                    </button>
                                </div>
                            </motion.div>
                        )}


                        {step === 5 && (
                            <motion.div key="step5" className="space-y-8">
                                <h2 className="text-3xl font-black text-center">Cálculo da Proporção</h2>
                                <p className="text-xs text-center text-slate-400 font-medium -mt-6">Informe a renda para calcularmos a divisão justa (Equidade)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-brand-purple uppercase tracking-widest text-center block">{setup.p1Name}</label>
                                        <input
                                            type="number" value={setup.p1Income}
                                            onChange={e => setSetup({ ...setup, p1Income: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 p-4 rounded-2xl text-center font-black outline-none"
                                            placeholder="R$ 0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-brand-magenta uppercase tracking-widest text-center block">{setup.p2Name}</label>
                                        <input
                                            type="number" value={setup.p2Income}
                                            onChange={e => setSetup({ ...setup, p2Income: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 p-4 rounded-2xl text-center font-black outline-none"
                                            placeholder="R$ 0"
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2rem] text-center space-y-4">
                                    <div className="flex items-center justify-center gap-8">
                                        <div>
                                            <p className="text-4xl mb-1">{setup.p1Avatar}</p>
                                            <p className="text-2xl font-black text-brand-purple">{100 - setup.incomeSplit}%</p>
                                        </div>
                                        <Scale className="text-slate-200" />
                                        <div>
                                            <p className="text-4xl mb-1">{setup.p2Avatar}</p>
                                            <p className="text-2xl font-black text-brand-magenta">{setup.incomeSplit}%</p>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full flex overflow-hidden">
                                        <div className="h-full bg-brand-purple" style={{ width: `${100 - setup.incomeSplit}%` }} />
                                        <div className="h-full bg-brand-magenta" style={{ width: `${setup.incomeSplit}%` }} />
                                    </div>
                                </div>
                                <button onClick={handleNext} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black text-lg">Confirmar</button>
                            </motion.div>
                        )}

                        {step === 6 && (
                            <motion.div key="step6" className="space-y-8 text-center">
                                <h2 className="text-3xl font-black">Quase Lá!</h2>

                                {/* Data do Casal */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-pink-100 dark:border-pink-900/30 text-left"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <CalendarHeart size={18} className="text-pink-500" />
                                        <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Qual a data especial de vocês?</label>
                                    </div>
                                    <input
                                        type="date"
                                        value={setup.coupleDate}
                                        onChange={e => setSetup({ ...setup, coupleDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold focus:ring-2 focus:ring-pink-400 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
                                        💕 Todo mês nessa data, vocês receberão um lembrete especial com um desafio exclusivo!
                                    </p>
                                </motion.div>

                                <div className="space-y-4">
                                    {/* Card 1 - Como funciona */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                                        className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 text-left flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-brand-gold/20 rounded-2xl shrink-0">
                                            <Coins className="text-brand-gold" size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-brand-purple dark:text-brand-gold uppercase text-xs tracking-wider mb-1">Cada número é o valor que você investe</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Sorteou o 47? Guarde R$ 47,00. Simples assim! Você controla o ritmo: sorteie um por vez ou em lote.</p>
                                        </div>
                                    </motion.div>

                                    {/* Card 2 - Quem sorteia */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                                        className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 text-left flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-brand-purple/15 rounded-2xl shrink-0">
                                            <Target className="text-brand-purple" size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-brand-purple dark:text-brand-gold uppercase text-xs tracking-wider mb-1">O sorteio está nas suas mãos</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Clique no botão e descubra o próximo número. Modo Individual (um por vez) ou Lote (vários de uma só vez).</p>
                                        </div>
                                    </motion.div>

                                    {/* Card 3 - Coach de IA (destaque) */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                                        className="bg-gradient-to-r from-brand-magenta to-brand-purple p-[2px] rounded-3xl"
                                    >
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.4rem] text-left flex items-start gap-4">
                                            <div className="p-3 bg-brand-magenta/15 rounded-2xl shrink-0">
                                                <Sparkles className="text-brand-magenta fill-brand-magenta/30" size={28} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-brand-magenta uppercase text-xs tracking-wider mb-1">🚀 Chegue mais rápido com o Coach de IA</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Desafios a dois que aceleram sua meta e tornam cada sorteio mais divertido. Dicas financeiras de elite, previsões inteligentes e desafios criativos que transformam guardar dinheiro em jogo de casal.</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                                <button onClick={handleNext} className="w-full py-5 bg-brand-purple text-white rounded-2xl font-black text-lg">Revisar e Começar</button>
                            </motion.div>
                        )}

                        {step === 7 && (
                            <motion.div key="step7" className="text-center space-y-8">
                                <div className="scale-110 mb-4 animate-bounce flex justify-center">
                                    <BingoLogo />
                                </div>
                                <h2 className="text-4xl font-black text-brand-purple dark:text-brand-gold tracking-tighter">O Sonho Começa!</h2>
                                <div className="bg-brand-gold/5 p-6 rounded-[2.5rem] border border-brand-gold/20 flex items-center justify-center gap-4">
                                    <div className="flex -space-x-3">
                                        <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-2xl">{setup.p1Avatar}</div>
                                        <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-2xl">{setup.p2Avatar}</div>
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest">{setup.p1Name} & {setup.p2Name}</p>
                                </div>
                                <button onClick={handleFinish} className="w-full py-6 bg-gradient-to-r from-brand-purple to-brand-magenta text-white rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    <Zap className="fill-current" size={24} /> INICIAR BINGO
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Onboarding;