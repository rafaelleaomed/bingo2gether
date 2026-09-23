import React, { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Crown, Lock } from 'lucide-react';

interface PlanGateProps {
    children: ReactNode;
    fallback?: ReactNode; // Optional custom fallback
    featureName?: string; // Name of the feature being gated
}

export const PlanGate: React.FC<PlanGateProps> = ({ children, fallback, featureName = 'Recurso PRO' }) => {
    const { user } = useAuthStore();

    if (user?.isPro) {
        return <>{children}</>;
    }

    if (fallback) return <>{fallback}</>;

    return (
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center gap-4 group">
            <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/20 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Lock className="text-slate-400" size={20} />
            </div>

            <div className="max-w-xs">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">{featureName}</h3>
                <p className="text-xs text-slate-500">
                    Disponível apenas para assinantes PRO. Desbloqueie para ter acesso.
                </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-[10px] font-black uppercase tracking-widest text-brand-gold">
                <Crown size={12} />
                Exclusivo PRO
            </div>
        </div>
    );
};
