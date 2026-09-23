import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import {
    LogIn, UserPlus, Mail, Lock, ArrowRight,
    ShieldCheck, Zap, Heart, Star, ChevronLeft, User, CheckCircle
} from 'lucide-react';
import { BingoLogo } from '../Onboarding';
import SalesPage from '../premium/SalesPage';

interface LoginPageProps {
    onBack?: () => void;
    isInviteFlow?: boolean;
    onSuccess?: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
    'Invalid login credentials': 'Credenciais inválidas. Verifique email e senha.',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'User already registered': 'Este email já está cadastrado. Faça login.',
    'Signup requires a valid password': 'Senha fraca. Use no mínimo 6 caracteres.',
    'Password should be at least 6 characters': 'Senha fraca. Use no mínimo 6 caracteres.',
};

function getErrorMessage(err: any): string {
    const msg = err?.message || '';
    return ERROR_MESSAGES[msg] || msg || 'Erro inesperado. Tente novamente.';
}

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const LoginPage: React.FC<LoginPageProps> = ({ onBack, isInviteFlow = false, onSuccess }) => {
    const [mode, setMode] = useState<'main' | 'email-login' | 'email-register' | 'forgot-password' | 'verify-email'>('main');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSalesPage, setShowSalesPage] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(true);
    const [resetSent, setResetSent] = useState(false);
    const [switchToLogin, setSwitchToLogin] = useState(false);
    const [persistLogin, setPersistLogin] = useState(true);

    const { login, register, googleLogin, devLogin, sendPasswordReset, resendVerificationEmail } = useAuthStore();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            localStorage.setItem('b2g_persist_login', persistLogin ? 'true' : 'false');
            await login(email, password);
            onSuccess?.();
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(email, password, name, marketingOptIn);
            setMode('verify-email');
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('already registered')) {
                setError('Este email já está cadastrado.');
                setSwitchToLogin(true);
            } else {
                setError(getErrorMessage(err));
                setSwitchToLogin(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            localStorage.setItem('b2g_persist_login', persistLogin ? 'true' : 'false');
            await googleLogin();
            // OAuth redirect handles the rest
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordReset(email);
            setResetSent(true);
        } catch (err: any) {
            setError('Erro ao enviar email de recuperação. Verifique o endereço.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setLoading(true);
        try {
            await resendVerificationEmail();
            setError('');
        } catch (err: any) {
            setError('Erro ao reenviar email de verificação.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode: typeof mode) => {
        setMode(newMode);
        setError('');
        setResetSent(false);
        setSwitchToLogin(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-y-auto font-sans">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-purple/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-gold/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <header className="relative z-20 px-6 pb-4 pt-[max(1.5rem,env(safe-area-inset-top,1.5rem))] flex justify-between items-center bg-slate-950/50 backdrop-blur-md">
                {(onBack && !isInviteFlow) || mode !== 'main' ? (
                    <button
                        onClick={() => mode !== 'main' ? switchMode('main') : onBack?.()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <div className="p-2 rounded-full border border-slate-800 group-hover:bg-slate-800 transition-all">
                            <ChevronLeft size={20} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Voltar</span>
                    </button>
                ) : <div />}
                <button
                    onClick={() => setShowSalesPage(true)}
                    className="px-3 py-1 bg-brand-gold/20 border border-brand-gold/30 rounded-full hover:bg-brand-gold/30 transition-all cursor-pointer"
                >
                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-1">
                        <Star size={10} className="fill-current" /> Versão PRO
                    </span>
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-block mb-6 relative">
                        <div className="absolute inset-0 bg-brand-gold/20 blur-2xl rounded-full animate-pulse"></div>
                        <BingoLogo className="w-24 h-24 relative z-10 border-4 border-brand-gold shadow-[0_0_30px_rgba(230,194,110,0.3)]" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                        Construindo o futuro juntos
                    </h1>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">
                        A jornada para a harmonia financeira do casal começa aqui.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <AnimatePresence mode="wait">
                        {mode === 'main' && (
                            <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5 relative z-10">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full py-5 bg-white text-slate-800 rounded-2xl font-black text-lg shadow-2xl shadow-white/10 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <GoogleIcon />
                                            <span>Entrar com Google</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        devLogin();
                                        onSuccess?.();
                                    }}
                                    className="w-full py-3.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 border border-amber-500/30 rounded-2xl font-bold text-xs text-amber-300 hover:text-white hover:border-amber-400/50 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <ShieldCheck size={16} className="text-amber-400" />
                                    <span>Explorar no Modo Demonstração (Portfólio / Offline)</span>
                                </button>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-slate-800"></div>
                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">ou com e-mail</span>
                                    <div className="flex-1 h-px bg-slate-800"></div>
                                </div>

                                <button
                                    onClick={() => switchMode('email-login')}
                                    className="w-full py-4 bg-slate-800/50 border border-slate-700 rounded-2xl font-bold text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-3"
                                >
                                    <LogIn size={18} />
                                    <span>Login com E-mail e Senha</span>
                                </button>

                                <button
                                    onClick={() => switchMode('email-register')}
                                    className="w-full py-4 bg-gradient-to-r from-brand-gold/10 to-brand-purple/10 border border-brand-gold/20 rounded-2xl font-bold text-sm text-brand-gold hover:from-brand-gold/20 hover:to-brand-purple/20 transition-all flex items-center justify-center gap-3"
                                >
                                    <UserPlus size={18} />
                                    <span>Criar Conta Grátis</span>
                                </button>

                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold text-center">
                                        {error}
                                    </motion.p>
                                )}

                                <div className="flex justify-center gap-6 mt-4">
                                    {[
                                        { icon: ShieldCheck, label: 'Seguro' },
                                        { icon: Zap, label: 'Instantâneo' },
                                        { icon: Heart, label: 'Para Casais' },
                                    ].map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity cursor-help">
                                            <Icon size={20} className="text-brand-gold" />
                                            <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {mode === 'email-login' && (
                            <motion.div key="email-login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-xl font-black text-white mb-6 text-center">Login com E-mail</h2>
                                <form onSubmit={handleEmailLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Senha</label>
                                            <button type="button" onClick={() => switchMode('forgot-password')} className="text-[9px] font-black text-brand-gold uppercase tracking-tighter hover:underline">Esqueci minha senha</button>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer py-1">
                                        <input type="checkbox" checked={persistLogin} onChange={e => setPersistLogin(e.target.checked)}
                                            className="w-4 h-4 accent-brand-gold bg-slate-800 border-slate-700 rounded" />
                                        <span className="text-[11px] font-bold text-slate-400">Manter-me conectado</span>
                                    </label>
                                    {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold text-center">{error}</motion.p>}
                                    <button type="submit" disabled={loading}
                                        className="w-full py-5 bg-gradient-to-r from-brand-gold to-[#c9a75e] text-brand-purple rounded-2xl font-black text-lg shadow-2xl shadow-brand-gold/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {loading ? <div className="w-6 h-6 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" /> : <><LogIn size={20} /> Entrar <ArrowRight size={18} /></>}
                                    </button>
                                    <p className="text-center text-slate-500 text-sm">
                                        Não tem conta? <button type="button" onClick={() => switchMode('email-register')} className="text-brand-gold font-black underline underline-offset-4">Cadastre-se</button>
                                    </p>
                                </form>
                            </motion.div>
                        )}

                        {mode === 'email-register' && (
                            <motion.div key="email-register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-xl font-black text-white mb-6 text-center">Criar Conta Grátis</h2>
                                <form onSubmit={handleEmailRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                    </div>

                                    <label className="flex items-start gap-3 cursor-pointer py-2">
                                        <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)}
                                            className="mt-1 w-4 h-4 accent-brand-gold bg-slate-800 border-slate-700 rounded" />
                                        <span className="text-[11px] text-slate-500 leading-relaxed">
                                            Aceito receber dicas e novidades por e-mail. Posso cancelar a qualquer momento.
                                        </span>
                                    </label>

                                    {error && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold text-center">
                                            {error}
                                            {switchToLogin && (
                                                <button type="button" onClick={() => switchMode('email-login')} className="block mx-auto mt-1 text-brand-gold underline text-[10px]">
                                                    Ir para Login →
                                                </button>
                                            )}
                                        </motion.p>
                                    )}

                                    <button type="submit" disabled={loading}
                                        className="w-full py-5 bg-gradient-to-r from-brand-gold to-[#c9a75e] text-brand-purple rounded-2xl font-black text-lg shadow-2xl shadow-brand-gold/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {loading ? <div className="w-6 h-6 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" /> : <><UserPlus size={20} /> Criar Conta <ArrowRight size={18} /></>}
                                    </button>
                                    <p className="text-center text-slate-500 text-sm">
                                        Já tem conta? <button type="button" onClick={() => switchMode('email-login')} className="text-brand-gold font-black underline underline-offset-4">Fazer Login</button>
                                    </p>
                                </form>
                            </motion.div>
                        )}

                        {mode === 'forgot-password' && (
                            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-xl font-black text-white mb-6 text-center">Recuperar Senha</h2>
                                {resetSent ? (
                                    <div className="text-center space-y-4">
                                        <CheckCircle className="text-green-400 w-16 h-16 mx-auto" />
                                        <p className="text-slate-400 text-sm">Email de recuperação enviado! Verifique sua caixa de entrada.</p>
                                        <button onClick={() => switchMode('email-login')} className="w-full py-4 bg-brand-gold text-brand-purple rounded-2xl font-black">
                                            Voltar ao Login
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleForgotPassword} className="space-y-5">
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-gold transition-colors" size={18} />
                                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-slate-700" />
                                        </div>
                                        {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
                                        <button type="submit" disabled={loading} className="w-full py-5 bg-brand-gold text-brand-purple rounded-2xl font-black text-lg disabled:opacity-50">
                                            {loading ? <div className="w-6 h-6 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mx-auto" /> : 'Enviar Link'}
                                        </button>
                                    </form>
                                )}
                            </motion.div>
                        )}

                        {mode === 'verify-email' && (
                            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="text-center space-y-5">
                                    <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto">
                                        <Mail className="text-brand-gold w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white">Verifique seu E-mail</h2>
                                    <p className="text-slate-400 text-sm">
                                        Enviamos um link de confirmação para <span className="font-bold text-brand-gold">{email}</span>.
                                    </p>
                                    <button onClick={handleResendVerification} disabled={loading}
                                        className="w-full py-4 bg-slate-800/50 border border-slate-700 rounded-2xl font-bold text-sm text-slate-300">
                                        {loading ? 'Reenviando...' : '🔄 Reenviar email'}
                                    </button>
                                    <button onClick={() => switchMode('email-login')}
                                        className="w-full py-4 bg-brand-gold text-brand-purple rounded-2xl font-black">
                                        Já Verifiquei — Fazer Login
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            {showSalesPage && <SalesPage onClose={() => setShowSalesPage(false)} />}

            {/* Policy Links Footer — discreet */}
            <div className="pb-6 pt-2 flex justify-center gap-4 flex-wrap">
                <a href="/politica-reembolso" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                    Política de Reembolso
                </a>
                <span className="text-slate-700 text-[11px]">·</span>
                <a href="/termos-e-privacidade" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                    Termos e Privacidade
                </a>
                <span className="text-slate-700 text-[11px]">·</span>
                <a href="/contato" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                    Suporte
                </a>
            </div>
        </div>
    );
};

export default LoginPage;
