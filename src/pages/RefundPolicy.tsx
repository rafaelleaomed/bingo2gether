import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RefundPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0612] text-white/80" style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-12">
        <button onClick={() => navigate('/')} className="mb-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-2xl font-black text-white mb-2">Política de Reembolsos e Devoluções</h1>
        <p className="text-white/30 text-sm mb-8">Última atualização: 16 de fevereiro de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-white/60">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">1. Política de cancelamento</h2>
            <p>Você pode cancelar sua assinatura do Bingo2Gether PRO a qualquer momento, sem taxas adicionais de cancelamento. Ao cancelar, você mantém o acesso a todos os recursos PRO até o final do período já pago.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">2. Reembolsos para planos recorrentes (Mensal e Anual)</h2>
            <p>Se você solicitar o cancelamento dentro de <strong className="text-white/80">7 dias</strong> após a primeira cobrança, faremos o reembolso integral do valor pago. Após esse período, não serão emitidos reembolsos parciais — o acesso PRO permanece ativo até o término do ciclo de cobrança vigente.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">3. Reembolsos para plano Vitalício</h2>
            <p>Para o plano Vitalício (pagamento único), oferecemos reembolso integral se solicitado dentro de <strong className="text-white/80">14 dias</strong> após a compra. Após esse prazo, o plano é considerado definitivo e não será reembolsável.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">4. Pagamentos via Boleto Bancário</h2>
            <p>Para pagamentos realizados via boleto bancário, o reembolso será processado via transferência bancária em até <strong className="text-white/80">10 dias úteis</strong> após a aprovação da solicitação.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">5. Como solicitar reembolso</h2>
            <p>Para solicitar um reembolso, entre em contato conosco pelo e-mail <a href="mailto:bingotwogether@gmail.com" className="text-purple-400 underline">bingotwogether@gmail.com</a> informando o e-mail da conta e o motivo da solicitação. Responderemos em até 48 horas.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-2">6. Disputas de cobrança</h2>
            <p>Se identificar uma cobrança indevida, entre em contato antes de abrir uma disputa junto à operadora do cartão. Resolveremos prontamente qualquer irregularidade.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
