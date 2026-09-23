import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, CheckCircle, AlertTriangle, DatabaseZap } from 'lucide-react';
import LoginPage from './LoginPage';
import { supabase } from '../../integrations/supabase/client';

interface AcceptInvitePageProps {
    token: string;
    onSuccess: () => void;
}

const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ token, onSuccess }) => {
    const { isAuthenticated, user, acceptInvite, logout } = useAuthStore();
    const [status, setStatus] = useState<'idle' | 'checking_conflict' | 'conflict' | 'processing' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const [inviterName, setInviterName] = useState<string>('seu parceiro(a)');

    useEffect(() => {
        // If already authenticated, check for conflicts before accepting
        if (isAuthenticated && user && status === 'idle') {
            checkConflict();
        }
    }, [isAuthenticated, user, status]);

    const checkConflict = async () => {
        setStatus('checking_conflict');
        try {
            const { data: invite } = await supabase.from('invites').select('couple_id').eq('token', token).maybeSingle();
            if (!invite) throw new Error('Convite inválido');

            // Find if user already has an active couple that is different from this invite
            if (user?.coupleId && user.coupleId !== invite.couple_id) {
                const { data: coupleObj } = await supabase.from('couples').select('owner_user_id').eq('id', invite.couple_id).single();
                if (coupleObj) {
                    const { data: inviterProfile } = await supabase.from('profiles').select('name').eq('id', coupleObj.owner_user_id).single();
                    setInviterName(inviterProfile?.name || 'seu parceiro(a)');
                }
                setStatus('conflict');
            } else {
                handleAccept(true); // Default to true if no conflict
            }
        } catch (err: any) {
            handleAccept(true);
        }
    };

    const handleAccept = async (keepInviterData: boolean) => {
        setStatus('processing');
        try {
            await acceptInvite(token, keepInviterData);
            setStatus('success');
            setTimeout(onSuccess, 3000); // Redirect after 3s
        } catch (err: any) {
            setError(err.message || 'Erro ao aceitar convite');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-500 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Dupla Formada!</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Vocês agora estão conectados e compartilham o mesmo progresso no bingo. Redirecionando...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (status === 'conflict') {
        return (
            <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl"
                >
                    <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <DatabaseZap className="text-brand-gold w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-3 tracking-tight">Conflito de Progresso Encontrado</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8 leading-relaxed">
                        Detectamos que você já possui um jogo em andamento, e sua dupla também. Para juntar as contas, é necessário escolher qual Bingo manter. O outro será <span className="text-red-500 font-bold">apagado</span> permanentemente.
                    </p>

                    <div className="space-y-4">
                        {/* Option A: Keep Inviter (Recommended usually if PRO) */}
                        <button
                            onClick={() => handleAccept(true)}
                            className="w-full relative overflow-hidden group p-5 bg-gradient-to-br from-brand-purple to-brand-magenta rounded-2xl flex flex-col items-start shadow-xl shadow-brand-purple/20 transition-all hover:scale-[1.02] active:scale-95 border border-white/10"
                        >
                            <div className="flex items-center justify-between w-full mb-2">
                                <span className="font-black text-white text-lg tracking-wide">Progresso de {inviterName}</span>
                                <span className="bg-brand-gold text-xs font-bold px-2 py-0.5 rounded uppercase text-black">Recomendado</span>
                            </div>
                            <p className="text-white/80 text-sm text-left">
                                Você abandonará seu jogo atual e se juntará ao bingo criado por {inviterName}.
                            </p>
                        </button>

                        <div className="relative py-2 flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                            <span className="relative bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-400 uppercase tracking-widest">OU</span>
                        </div>

                        {/* Option B: Keep Invitee (Me) */}
                        <button
                            onClick={() => handleAccept(false)}
                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl flex flex-col items-start border-2 border-slate-200 dark:border-slate-700 transition-all hover:border-brand-purple"
                        >
                            <div className="flex items-center justify-between w-full mb-2">
                                <span className="font-bold text-slate-700 dark:text-white">Meu próprio Progresso</span>
                            </div>
                            <p className="text-slate-500 text-sm text-left">
                                {inviterName} abandonará o jogo dele e entrará no SEU bingo atual. O jogo de {inviterName} será perdido.
                            </p>
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <button onClick={logout} className="text-sm text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2 py-2">
                            Entrar com outra conta
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md mb-8 text-center">
                        <div className="w-16 h-16 bg-brand-purple/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Heart className="text-brand-purple w-8 h-8" fill="currentColor" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">Você foi convidado!</h1>
                        <p className="text-slate-400">
                            Entre ou crie uma conta para se juntar à sua dupla e jogar o Bingo dos Sonhos juntos.
                        </p>
                    </div>

                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                        <LoginPage
                            isInviteFlow={true}
                            onSuccess={() => { }} // We define explicit success handling via useEffect above 
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                {status === 'error' ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="text-red-500 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Ops! Algo deu errado</h3>
                        <p className="text-slate-500 text-sm mb-6">{error}</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onSuccess}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                            >
                                Voltar ao Início
                            </button>
                            <button
                                onClick={logout}
                                className="text-xs text-red-500 underline"
                            >
                                Sair desta conta e tentar outra
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Conectando duplas...</h3>
                    </>
                )}
            </div>
        </div>
    );
};

export default AcceptInvitePage;
