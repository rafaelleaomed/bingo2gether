import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Mail, Lock, User, LogIn, UserPlus, RefreshCw, CheckCircle } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const { login, register, googleLogin, sendPasswordReset, resendVerificationEmail } = useAuthStore();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
                onClose();
            } else if (mode === 'register') {
                await register(email, password, name);
                setMode('verify');
            }
        } catch (err: any) {
            setError(err?.message || 'Ocorreu um erro.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await googleLogin();
            // OAuth redirect handles the rest
        } catch (err: any) {
            setError(err?.message || 'Falha ao autenticar com Google');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordReset(email);
            setResetSent(true);
        } catch {
            setError('Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    const GoogleIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="relative p-8 md:p-10">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all">
                        <X size={20} />
                    </button>

                    {mode === 'verify' ? (
                        <div className="text-center space-y-4 pt-4">
                            <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto">
                                <Mail className="text-brand-gold w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-brand-purple dark:text-brand-gold">Verifique seu E-mail</h2>
                            <p className="text-slate-500 text-sm">Enviamos um link para <span className="font-bold text-brand-purple dark:text-brand-gold">{email}</span>.</p>
                            <button onClick={async () => { setLoading(true); try { await resendVerificationEmail(); } catch {} setLoading(false); }} disabled={loading}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Reenviar
                            </button>
                            <button onClick={onClose} className="w-full py-4 bg-brand-purple dark:bg-brand-gold dark:text-brand-purple text-white rounded-2xl font-black">
                                Já Verifiquei — Continuar
                            </button>
                        </div>
                    ) : mode === 'forgot' ? (
                        <div className="space-y-4 pt-4">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-brand-purple dark:text-brand-gold">Recuperar Senha</h2>
                            </div>
                            {resetSent ? (
                                <div className="text-center space-y-4">
                                    <CheckCircle className="text-green-500 w-12 h-12 mx-auto" />
                                    <p className="text-slate-500 text-sm">Email enviado! Verifique sua caixa de entrada.</p>
                                    <button onClick={() => { setMode('login'); setResetSent(false); }} className="w-full py-4 bg-brand-purple dark:bg-brand-gold dark:text-brand-purple text-white rounded-2xl font-black">
                                        Voltar ao Login
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgot} className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold focus:border-brand-purple dark:focus:border-brand-gold outline-none transition-all" />
                                    </div>
                                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                                    <button type="submit" disabled={loading} className="w-full py-4 bg-brand-purple dark:bg-brand-gold dark:text-brand-purple text-white rounded-2xl font-black disabled:opacity-50">
                                        {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Enviar Link'}
                                    </button>
                                    <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-brand-purple dark:text-brand-gold font-bold">← Voltar ao Login</button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-black text-brand-purple dark:text-brand-gold tracking-tight mb-2">
                                    {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    {mode === 'login' ? 'Entre para sincronizar seu progresso' : 'Comece a jornada em dupla'}
                                </p>
                            </div>

                            <button onClick={handleGoogleLogin} disabled={loading}
                                className="w-full py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 mb-6 disabled:opacity-50">
                                <GoogleIcon /> Entrar com Google
                            </button>

                            <div className="relative my-6 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                <span className="bg-white dark:bg-slate-900 px-4 relative z-10">ou</span>
                                <div className="absolute top-1/2 left-0 w-full h-px bg-slate-100 dark:bg-slate-800"></div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'register' && (
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold focus:border-brand-purple dark:focus:border-brand-gold outline-none transition-all" />
                                    </div>
                                )}
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold focus:border-brand-purple dark:focus:border-brand-gold outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 font-bold focus:border-brand-purple dark:focus:border-brand-gold outline-none transition-all" />
                                    </div>
                                    {mode === 'login' && (
                                        <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-bold text-brand-gold ml-1 hover:underline">Esqueci minha senha</button>
                                    )}
                                </div>
                                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                                <button type="submit" disabled={loading}
                                    className="w-full py-5 bg-brand-purple dark:bg-brand-gold dark:text-brand-purple text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-purple/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <>{mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />} {mode === 'login' ? 'Entrar' : 'Criar Conta'}</>}
                                </button>
                            </form>

                            <p className="text-center mt-6 text-sm font-medium text-slate-500">
                                {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
                                <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                                    className="ml-2 text-brand-purple dark:text-brand-gold font-black underline underline-offset-4">
                                    {mode === 'login' ? 'Cadastre-se' : 'Fazer Login'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
