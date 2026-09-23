import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, DollarSign, Calculator, Clock } from 'lucide-react';

interface BaitSpreadsheetProps {
    onComplete: () => void;
}

const BaitSpreadsheet: React.FC<BaitSpreadsheetProps> = ({ onComplete }) => {
    const [incomeA, setIncomeA] = useState<number | "">("");
    const [incomeB, setIncomeB] = useState<number | "">("");
    const [expenses, setExpenses] = useState<number | "">("");

    // Derived state
    const totalIncome = (Number(incomeA) || 0) + (Number(incomeB) || 0);
    const totalExpenses = (Number(expenses) || 0);
    const remaining = totalIncome - totalExpenses;

    const shareA = totalIncome > 0 ? Math.round(((Number(incomeA) || 0) / totalIncome) * 100) : 50;
    const shareB = totalIncome > 0 ? Math.round(((Number(incomeB) || 0) / totalIncome) * 100) : 50;

    const contribA = remaining > 0 ? (remaining * (shareA / 100)) : 0;
    const contribB = remaining > 0 ? (remaining * (shareB / 100)) : 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 overflow-x-hidden w-full">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200 p-6 shadow-sm sticky top-0 z-10 w-full">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    Sim. Dá pra organizar a vida financeira do casal numa planilha.
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                    O problema nunca foi o método. <br />
                    Foi manter isso vivo no dia a dia.
                </p>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-8 mt-4 w-full">

                {/* BLOCO 1 - RENDA */}
                <section className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Passo 1</span>
                        <h2 className="text-lg font-bold text-slate-800">Aqui começa tudo.</h2>
                        <p className="text-xs text-slate-400">Não é sobre quem ganha mais. É sobre construir juntos.</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Renda Pessoa A</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">R$</span>
                                <input
                                    type="number"
                                    value={incomeA}
                                    onChange={e => setIncomeA(Number(e.target.value) || "")}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Renda Pessoa B</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">R$</span>
                                <input
                                    type="number"
                                    value={incomeB}
                                    onChange={e => setIncomeB(Number(e.target.value) || "")}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[10px] text-slate-400 italic">
                            "Esse é o primeiro ponto onde casais começam a se comparar… mesmo sem perceber."
                        </p>
                    </div>
                </section>

                {/* BLOCO 2 - DESPESAS */}
                <section className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                    <div>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Passo 2</span>
                        <h2 className="text-lg font-bold text-slate-800">Agora a parte que todo casal conhece.</h2>
                        <p className="text-xs text-slate-400">Anotar. Somar. Conferir.</p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Despesas Totais (Média)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400">R$</span>
                            <input
                                type="number"
                                value={expenses}
                                onChange={e => setExpenses(Number(e.target.value) || "")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 font-mono text-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-red-50 p-2 rounded text-center justify-center">
                        <Clock size={14} className="text-red-400" />
                        <span>Esse esforço parece pequeno hoje. Mas ele se repete… toda semana.</span>
                    </div>
                </section>

                {/* BLOCO 3 - DIVISÃO */}
                {totalIncome > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div>
                            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Resultado</span>
                            <h2 className="text-lg font-bold text-slate-800">Vamos fazer do jeito justo.</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Pessoa A ({shareA}%)</p>
                                <p className="text-lg font-bold text-slate-700">{formatCurrency(contribA)}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Pessoa B ({shareB}%)</p>
                                <p className="text-lg font-bold text-slate-700">{formatCurrency(contribB)}</p>
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-xs text-slate-500 font-medium">
                                Quem ganha mais contribui mais.<br />
                                Quem ganha menos não se sente injustiçado.
                            </p>
                            <p className="text-sm font-black text-slate-800">
                                Funciona. Mas exige constância manual.
                            </p>
                        </div>
                    </motion.section>
                )}

                {/* BLOCO 4 - AHA RACIONAL */}
                {totalIncome > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-brand-purple/5 border border-brand-purple/20 p-6 rounded-2xl text-center space-y-4"
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-2xl">💡</div>
                        <h3 className="font-bold text-slate-900">Percebe algo importante?</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Vocês já sabem poupar. A lógica está certa. <br /><br />
                            <span className="font-bold text-slate-800">O problema é que a planilha exige disciplina fria.</span> <br />
                            E quando o amor está cansado… a planilha é a primeira a ser abandonada.
                        </p>
                    </motion.div>
                )}

                {/* FOOTER METRICS */}
                <div className="text-center space-y-1 py-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Economia de tempo estimada com o App:</p>
                    <p className="text-xl font-black text-brand-purple">≈ 45 minutos por mês</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        Tempo que poderia estar sendo usado pra viver o sonho… não pra calcular ele.
                    </p>
                </div>

            </main>

            {/* FIXED CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-md mx-auto space-y-3">
                    <p className="text-xs text-center text-slate-500 font-medium hidden sm:block">
                        Agora imagina se isso aqui fosse automático, divertido e um ritual de casal.
                    </p>
                    <button
                        onClick={onComplete}
                        className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white font-bold py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                    >
                        Conhecer o Bingo2Gether <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BaitSpreadsheet;
