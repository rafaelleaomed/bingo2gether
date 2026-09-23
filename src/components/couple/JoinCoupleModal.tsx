import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';

interface JoinCoupleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const JoinCoupleModal: React.FC<JoinCoupleModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const { acceptInvite } = useAuthStore();

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (code.length < 6) return;
        setStatus('loading');
        setError('');
        try {
            await acceptInvite(code.toLowerCase());
            setStatus('success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Código inválido ou expirado.');
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 p-8"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                </button>

                {status === 'success' ? (
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="text-green-500 w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Dupla Formada!</h2>
                        <p className="text-slate-500 text-sm">Vocês agora compartilham a mesma dashboard.</p>
                    </div>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto">
                            <Heart className="text-brand-purple w-8 h-8" fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Inserir Código</h2>
                            <p className="text-slate-500 text-sm">
                                Digite o código de 6 caracteres que seu parceiro(a) enviou para você.
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <InputOTP maxLength={6} value={code} onChange={setCode}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                    <InputOTPSlot index={1} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                    <InputOTPSlot index={2} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                    <InputOTPSlot index={3} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                    <InputOTPSlot index={4} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                    <InputOTPSlot index={5} className="w-12 h-14 text-lg font-black border-brand-purple/30" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl">
                                <AlertTriangle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={code.length < 6 || status === 'loading'}
                            className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-purple/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {status === 'loading' ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                            ) : (
                                'Conectar Dupla'
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default JoinCoupleModal;
