import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PaymentSuccess: React.FC = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const celebrate = async () => {
      await checkAuth();
      await useAuthStore.getState().checkPlanStatus();
      setShowConfetti(true);
    };
    celebrate();
  }, [checkAuth]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#4B1E6D] to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {showConfetti && Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400), opacity: 1 }}
            animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20, opacity: 0 }}
            transition={{ duration: 2 + Math.random() * 3, delay: Math.random() * 1.5 }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: ['#E6C26E', '#C13C7A', '#4B1E6D', '#fff'][Math.floor(Math.random() * 4)],
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="bg-gradient-to-b from-slate-900/95 to-[#4B1E6D]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/15 text-center shadow-2xl shadow-[#4B1E6D]/30">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-28 h-28 bg-gradient-to-br from-[#E6C26E] to-[#C13C7A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(230,192,110,0.4)]"
          >
            <Crown className="text-white w-14 h-14 drop-shadow-lg" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Pagamento confirmado</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-3xl font-black text-white uppercase tracking-tight mb-2">
            Vocês são PRO!
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-slate-300 text-sm font-medium mb-8 leading-relaxed">
            Parabéns! Todos os recursos exclusivos estão desbloqueados para vocês dois. Continuem construindo juntos! 💜
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#E6C26E]" />
              <span className="text-white text-sm font-bold">Desbloqueado para vocês</span>
            </div>
            <ul className="space-y-2 text-left">
              {['Simulador de metas financeiras', 'Previsão inteligente de conquistas', 'Sincronização em tempo real', 'Skins e temas exclusivos', 'Desafios premium para o casal'].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#E6C26E] shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            onClick={handleGoHome}
            className="w-full py-4 bg-gradient-to-r from-[#E6C26E] to-[#C13C7A] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:shadow-2xl hover:shadow-[#C13C7A]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Começar a jogar
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
