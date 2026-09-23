import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, ArrowRight, Heart, Target, TrendingUp, Users, Shield, Zap, Star,
  CheckCircle2, MessageSquare, Sparkles, Lock, ChevronDown, ArrowLeft, Flame, Gift, QrCode
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { useAuthStore } from '../../store/authStore';

interface SalesPageProps {
  onClose: () => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isAuthenticated } = useAuthStore();

  // Handle browser back button
  useEffect(() => {
    window.history.pushState({ salesPage: true }, '');
    const handlePopState = (e: PopStateEvent) => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const plans = [
    {
      id: 'monthly' as const,
      name: 'Mensal',
      price: 29,
      cents: '90',
      monthlyPrice: '29,90',
      period: '/mês',
      saving: null,
      best: false,
      highlight: 'Sem compromisso',
      badge: null,
    },
    {
      id: 'annual' as const,
      name: 'Anual',
      price: 199,
      cents: '90',
      monthlyPrice: '16,66',
      fullMonthly: '29,90',
      period: '/ano',
      saving: '44%',
      best: true,
      highlight: '12x de R$ 16,66',
      badge: '🔥 Mais popular',
    },
    {
      id: 'lifetime' as const,
      name: 'Vitalício',
      price: 399,
      cents: '90',
      monthlyPrice: null,
      period: 'pagamento único',
      saving: null,
      best: false,
      highlight: 'Pague uma vez, use pra sempre',
      badge: '♾️ Eterno',
    },
  ];

  const handlePayment = async (method: 'card' | 'boleto' | 'pix' = 'card') => {
    if (!isAuthenticated) {
      setError('Você precisa fazer login antes de assinar. Feche esta página e entre com sua conta.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // All methods use the same Payment Link — Stripe offers card/boleto/PIX on checkout
      const result = await paymentService.createStripeSession(selectedPlan);
      if (result?.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        setError('Erro ao gerar link de pagamento. Tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento. Tente novamente em alguns segundos.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: <Users size={20} />, title: 'Conta compartilhada', desc: 'Vocês dois na mesma dashboard, acompanhando o progresso juntos em tempo real.' },
    { icon: <TrendingUp size={20} />, title: 'Previsão inteligente com IA', desc: 'Saiba exatamente quando vocês vão atingir a meta. A IA calcula tudo.' },
    { icon: <Sparkles size={20} />, title: 'Coach financeiro ilimitado', desc: 'O Oráculo cria desafios e dicas personalizadas pro casal. Sem limites.' },
    { icon: <Heart size={20} />, title: 'Modo Meses Difíceis', desc: 'Quando o mês aperta, o app se adapta. Zero culpa, zero pressão.' },
    { icon: <Star size={20} />, title: 'Skins & temas exclusivos', desc: 'Personalizem tudo: cores, temas e aparência do bingo.' },
    { icon: <Shield size={20} />, title: 'Dados 100% seguros', desc: 'Criptografia de ponta. Seus dados financeiros protegidos.' },
  ];

  const faqs = [
    { q: '1 plano serve para os dois?', a: 'Sim! Um único plano PRO cobre o casal inteiro. Sem cobranças extras, sem surpresas.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim, sem taxas de cancelamento. Você mantém acesso até o fim do período pago.' },
    { q: 'E se o mês apertar?', a: 'O app nunca vai te punir. O Modo Meses Difíceis mantém o progresso mesmo com aportes menores.' },
    { q: 'Funciona sem o parceiro?', a: 'Sim! Você pode usar sozinho e convidar seu parceiro(a) quando quiser.' },
    { q: 'Quais formas de pagamento?', a: 'Cartão de crédito/débito e Boleto Bancário (para planos Anual e Vitalício). Pagamento processado com segurança pelo Stripe.' },
  ];

  const selected = plans.find(p => p.id === selectedPlan)!;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto" style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <div className="min-h-screen" style={{ background: 'linear-gradient(170deg, #1a0a2e 0%, #0f0a1a 30%, #0a0612 100%)' }}>
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[150px]" />
        </div>

        {/* Back button */}
        <button onClick={onClose} className="fixed left-5 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all backdrop-blur-md border border-white/10" style={{ top: 'max(20px, env(safe-area-inset-top))' }}>
          <ArrowLeft size={20} />
        </button>

        <div className="relative z-10 max-w-lg mx-auto px-5 pt-16" style={{ paddingBottom: 'max(64px, env(safe-area-inset-bottom))' }}>
          {/* HERO */}
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6" style={{ background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.2)' }}>
              <Crown size={13} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-300/90">Bingo2Gether PRO</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-4">
              Parem de brigar<br />por dinheiro.<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #c084fc, #e879f9, #facc15)' }}>
                Comecem a construir juntos.
              </span>
            </h1>
            <p className="text-white/40 font-medium max-w-sm mx-auto leading-relaxed">
              A jornada para a harmonia financeira do casal — sem planilhas, sem culpa, sem complicação.
            </p>
          </motion.section>

          {/* PAIN POINTS */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-16">
            <h2 className="text-lg font-black text-white/80 text-center mb-6">Vocês já passaram por isso?</h2>
            <div className="space-y-3">
              {[
                'Tentaram planilhas... e desistiram no segundo mês',
                'Evitam falar sobre dinheiro para não criar clima',
                'Um ganha mais que o outro e isso gera desconforto',
                'Começam a guardar e param por falta de motivação',
              ].map((pain, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.1)' }}>
                  <MessageSquare size={16} className="text-red-400/60 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/50 font-medium">{pain}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* SOLUTION */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-16 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
              <Target size={28} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-3">Bingo2Gether resolve isso.</h2>
            <p className="text-white/40 font-medium max-w-sm mx-auto leading-relaxed text-sm">
              Transformem metas financeiras em um jogo para dois. Cada mês vocês "jogam" juntos, e cada número sorteado é um passo a mais rumo ao sonho de vocês.
            </p>
          </motion.section>

          {/* BENEFITS */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-16">
            <h2 className="text-lg font-black text-white/80 text-center mb-6">O que vocês ganham com o PRO</h2>
            <div className="grid gap-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background: 'rgba(168,85,247,0.04)', borderColor: 'rgba(168,85,247,0.1)' }}>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">{b.icon}</div>
                  <div>
                    <h3 className="text-sm font-black text-white mb-0.5">{b.title}</h3>
                    <p className="text-xs text-white/40 font-medium leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* SOCIAL PROOF */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-16">
            <div className="space-y-3">
              {[
                { text: '"A gente parou de brigar sobre dinheiro. Agora é um jogo, e a gente joga junto."', name: 'Camila & Rafael' },
                { text: '"Em 4 meses guardamos o que não conseguimos em 2 anos de planilha."', name: 'Juliana & Pedro' },
                { text: '"Mesmo nos meses difíceis, a gente não parou. Isso fez toda a diferença."', name: 'Larissa & Bruno' },
              ].map((t, i) => (
                <div key={i} className="p-5 rounded-2xl border" style={{ background: 'rgba(250,204,21,0.03)', borderColor: 'rgba(250,204,21,0.1)' }}>
                  <p className="text-sm text-white/60 font-medium italic mb-2">{t.text}</p>
                  <p className="text-[10px] font-black text-yellow-400/60 uppercase tracking-widest">— {t.name}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* PRICING */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-12" id="pricing">
            <h2 className="text-xl font-black text-white text-center mb-2">Escolha o plano de vocês</h2>
            <p className="text-white/30 text-sm text-center mb-8">1 plano = 2 pessoas. Sem cobranças extras.</p>

            {/* Plan Cards */}
            <div className="space-y-3 mb-6">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(217,70,239,0.08))'
                        : 'rgba(255,255,255,0.02)',
                      borderColor: isSelected ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)',
                      boxShadow: isSelected ? '0 0 30px rgba(168,85,247,0.1)' : 'none',
                    }}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={{
                            background: plan.best
                              ? 'linear-gradient(135deg, #facc15, #f59e0b)'
                              : 'rgba(168,85,247,0.2)',
                            color: plan.best ? '#422006' : '#c084fc',
                          }}>
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-purple-400' : 'border-white/15'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />}
                      </div>
                      <span className="text-sm font-black text-white">{plan.name}</span>
                    </div>

                    <div className="pl-8">
                      {plan.id === 'annual' ? (
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-white/30 text-sm line-through font-bold">R$ {plan.fullMonthly}/mês</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              -{plan.saving}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">R$ {plan.monthlyPrice}</span>
                            <span className="text-white/40 text-sm font-semibold">/mês</span>
                          </div>
                          <p className="text-[11px] text-white/25 font-medium mt-1">
                            Cobrado R$ {plan.price},{plan.cents} por ano
                          </p>
                        </div>
                      ) : plan.id === 'monthly' ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">R$ {plan.monthlyPrice}</span>
                            <span className="text-white/40 text-sm font-semibold">/mês</span>
                          </div>
                          <p className="text-[11px] text-white/25 font-medium mt-1">{plan.highlight}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">R$ {plan.price},{plan.cents}</span>
                          </div>
                          <p className="text-[11px] text-white/25 font-medium mt-1">{plan.highlight}</p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Comparison note */}
            <div className="flex items-center justify-center gap-2 mb-6 py-3 px-4 rounded-xl" style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.1)' }}>
              <Gift size={16} className="text-yellow-400/70 shrink-0" />
              <span className="text-xs text-yellow-300/60 font-bold">
                {selectedPlan === 'annual'
                  ? 'Economize R$ 159 por ano em relação ao plano mensal'
                  : selectedPlan === 'lifetime'
                    ? 'Equivale a pouco mais de 1 ano de plano anual — depois, é tudo grátis!'
                    : 'Experimente sem compromisso, cancele quando quiser'}
              </span>
            </div>

            {error && (
              <div className="text-center text-[12px] font-bold text-red-400 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                {error}
                <button onClick={() => setError(null)} className="block mx-auto mt-2 text-[10px] text-white/40 underline">Fechar</button>
              </div>
            )}

            <div className="space-y-3">
              {!isAuthenticated ? (
                <button
                  onClick={onClose}
                  className="group w-full relative py-5 rounded-2xl font-black text-[14px] uppercase tracking-wider text-white flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all overflow-hidden border border-yellow-500/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(245,158,11,0.1))',
                  }}
                >
                  <Lock size={17} />
                  Fazer login para assinar
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <>
                  <button
                    disabled={loading}
                    onClick={() => handlePayment('card')}
                    className="group w-full relative py-5 rounded-2xl font-black text-[14px] uppercase tracking-wider text-white flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all disabled:opacity-50 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c026d3)',
                      boxShadow: '0 8px 32px rgba(139,92,246,0.35), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap size={17} className="fill-current" />
                        {selectedPlan === 'annual' ? 'Assinar por R$ 16,66/mês' : selectedPlan === 'monthly' ? 'Assinar por R$ 29,90/mês' : 'Garantir acesso vitalício'}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {selectedPlan !== 'monthly' && (
                    <button
                      disabled={loading}
                      onClick={() => handlePayment('boleto')}
                      className="group w-full relative py-4 rounded-2xl font-black text-[12px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all disabled:opacity-50 border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <QrCode size={16} />
                      Pagar com Boleto
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6 text-white/20">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <Shield size={14} /> Pagamento seguro
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <Lock size={14} /> Cancele quando quiser
              </div>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-16">
            <h2 className="text-lg font-black text-white/80 text-center mb-6">Dúvidas frequentes</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <button
                  key={i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-4 rounded-2xl border transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: openFaq === i ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/70">{faq.q}</span>
                    <ChevronDown size={16} className={`text-white/30 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  {openFaq === i && (
                    <p className="text-xs text-white/40 font-medium mt-3 leading-relaxed">{faq.a}</p>
                  )}
                </button>
              ))}
            </div>
          </motion.section>

          {/* GUARANTEE */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center pb-12">
            <div className="p-6 rounded-2xl border" style={{ background: 'rgba(250,204,21,0.03)', borderColor: 'rgba(250,204,21,0.1)' }}>
              <Shield size={32} className="text-yellow-400/60 mx-auto mb-3" />
              <h3 className="text-sm font-black text-white mb-2">Sem risco. Sem taxas escondidas.</h3>
              <p className="text-xs text-white/40 font-medium leading-relaxed max-w-xs mx-auto">
                Cancele quando quiser, sem burocracia. Seus dados ficam seguros e você mantém acesso até o fim do período pago.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
