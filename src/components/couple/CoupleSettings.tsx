import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Users, Copy, Check, Crown, Clock, ShieldCheck, Heart, Lock, ArrowRight, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { PricingModal } from '../premium/PricingModal';

export const CoupleSettings: React.FC = () => {
    const { user, createCouple } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [partnerEmailInput, setPartnerEmailInput] = useState('');
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [showPricing, setShowPricing] = useState(false);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Vitalício';
        return new Date(dateString).toLocaleDateString();
    };

    const getDaysRemaining = () => {
        if (!user?.planExpiresAt) return null;
        const diff = new Date(user.planExpiresAt).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleCreateCouple = async () => {
        setLoading(true);
        setError('');
        try {
            await createCouple();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao criar conta compartilhada');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInviteLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await useAuthStore.getState().invitePartner(partnerEmailInput);
            setInviteLink(`${window.location.origin}/?invite=${data.token}`);
        } catch (err: any) {
            setError(err.message || err.response?.data?.error || 'Erro ao gerar convite');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
                    <Heart className="text-brand-purple" size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Minha Dupla</h2>
                    <p className="text-xs text-slate-500 font-medium">Gerencie sua conta compartilhada</p>
                </div>
            </div>

            {/* Plan Status Card */}
            <div className={`p-6 rounded-3xl border-2 ${user.isPro ? 'bg-gradient-to-br from-brand-purple to-slate-900 border-brand-gold/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {user.isPro && <Crown size={16} className="text-brand-gold" />}
                            <h3 className={`font-black uppercase tracking-widest text-xs ${user.isPro ? 'text-brand-gold' : 'text-slate-500'}`}>
                                Plano Atual
                            </h3>
                        </div>
                        <p className={`text-2xl font-black ${user.isPro ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                            {user.planType === 'free' ? 'Gratuito' :
                                user.planType === 'mensal' ? 'PRO Mensal' :
                                    user.planType === 'anual' ? 'PRO Anual' : 'PRO Vitalício'}
                        </p>
                    </div>
                    {!user.isPro && (
                        <button onClick={() => setShowPricing(true)}
                            className="px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-bold hover:scale-105 transition-all shadow-lg shadow-brand-purple/20">
                            Virar PRO
                        </button>
                    )}
                    {user.isPro && (
                        <div className="px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-black uppercase tracking-widest border border-brand-gold/30">
                            Ativo
                        </div>
                    )}
                </div>

                {user.isPro && user.planType !== 'vitalicio' && (
                    <div className="flex items-center gap-2 text-slate-300 text-xs font-medium bg-white/5 p-3 rounded-xl border border-white/10">
                        <Clock size={14} className="text-brand-gold" />
                        <span>Expira em {formatDate(user.planExpiresAt)} ({getDaysRemaining()} dias)</span>
                    </div>
                )}
                {user.isPro && user.planType === 'vitalicio' && (
                    <div className="flex items-center gap-2 text-slate-300 text-xs font-medium bg-white/5 p-3 rounded-xl border border-white/10">
                        <ShieldCheck size={14} className="text-brand-gold" />
                        <span>Acesso Vitalício Garantido</span>
                    </div>
                )}
            </div>

            {/* Couple Management */}
            {!user.coupleId ? (
                !user.isPro ? (
                    // FREE user - show PRO gate
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-purple/5 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="text-brand-gold" size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">Conta Compartilhada</h3>
                            <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
                                Jogue em dupla! Convide seu parceiro(a) e acompanhem o progresso juntos.
                            </p>

                            <div className="w-full space-y-2 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-5 text-left">
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-brand-purple shrink-0" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Dashboard sincronizada para o casal</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Sparkles size={16} className="text-brand-gold shrink-0" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">IA ilimitada e mais inteligente</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={16} className="text-indigo-500 shrink-0" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Previsões financeiras avançadas</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Zap size={16} className="text-emerald-500 shrink-0" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Desafios interativos exclusivos</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-xs font-black uppercase tracking-widest text-brand-gold mx-auto w-fit mb-4">
                                <Crown size={14} />
                                Exclusivo PRO
                            </div>

                            <button
                                onClick={() => setShowPricing(true)}
                                className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-magenta text-white rounded-2xl font-black shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                DESBLOQUEAR AGORA <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    // PRO user - show create couple button
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Jogue em Dupla</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                            Crie uma conta compartilhada para convidar seu parceiro(a).
                        </p>
                        <button onClick={handleCreateCouple} disabled={loading}
                            className="px-6 py-3 bg-brand-purple text-white rounded-2xl font-bold shadow-lg shadow-brand-purple/20 hover:scale-105 transition-all disabled:opacity-50">
                            {loading ? 'Criando...' : 'Criar Conta Compartilhada'}
                        </button>
                        {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Membros</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">
                                    {user.name?.charAt(0) || 'E'}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {user.name || 'Eu'} <span className="text-xs font-normal text-slate-400">({user.role === 'owner' ? 'Dono' : 'Parceiro'})</span>
                                    </p>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                </div>
                            </div>

                            {user.partnerName && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-magenta text-white flex items-center justify-center font-bold text-xs">
                                        {user.partnerName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {user.partnerName} <span className="text-xs font-normal text-slate-400">(Parceiro)</span>
                                        </p>
                                        {user.partnerEmail && <p className="text-xs text-slate-500">{user.partnerEmail}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Invite Link Section - only for owner without partner */}
                        {user.role === 'owner' && !user.partnerEmail && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                                    Convidar Parceiro(a)
                                </label>
                                {inviteLink ? (
                                    <div className="space-y-4">
                                        <div className="bg-white dark:bg-slate-900 border-2 border-brand-purple/30 rounded-2xl py-4 px-4 text-center">
                                            <p className="text-xs text-slate-500 mb-1">Link gerado para {partnerEmailInput}</p>
                                            <span className="text-[10px] sm:text-xs font-bold text-brand-purple dark:text-brand-gold break-all">
                                                {inviteLink}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCopy}
                                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-brand-purple dark:text-brand-gold rounded-xl font-bold hover:scale-105 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
                                                {copied ? <Check size={18} /> : <Copy size={18} />} Copiar
                                            </button>
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(`Oi, mozão! Baixe o app Bingo2Gether e clique no meu link de convite para juntar nosso progresso financeiro: ${inviteLink}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-3 bg-[#25D366] text-white rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-sm shadow-[#25D366]/20 flex items-center justify-center"
                                            >
                                                Compartilhar
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleGenerateInviteLink} className="space-y-3">
                                        <p className="text-sm text-slate-500">
                                            Insira o e-mail do seu parceiro(a) para gerar um link exclusivo de convite.
                                        </p>
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="E-mail da dupla"
                                            value={partnerEmailInput}
                                            onChange={(e) => setPartnerEmailInput(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-brand-purple transition-all outline-none dark:text-white"
                                        />
                                        <button type="submit" disabled={loading || !partnerEmailInput}
                                            className="w-full py-3 bg-brand-purple text-white rounded-xl font-bold hover:bg-brand-purple/90 transition-all disabled:opacity-50">
                                            {loading ? 'Gerando...' : 'Gerar Link de Convite'}
                                        </button>
                                    </form>
                                )}
                                {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPricing && <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />}
        </div>
    );
};
