import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsAndPrivacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0612] text-white/80" style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-12">
        <button onClick={() => navigate('/')} className="mb-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-2xl font-black text-white mb-2">Termos de Serviço e Política de Privacidade</h1>
        <p className="text-white/30 text-sm mb-8">Última atualização: 16 de fevereiro de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-white/60">
          {/* TERMOS */}
          <h2 className="text-xl font-black text-white/95 mt-4">Termos de Serviço</h2>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">1. Aceitação dos Termos</h3>
            <p>Ao criar uma conta e utilizar o Bingo2Gether, você concorda com estes Termos de Serviço. Se não concordar, não utilize a plataforma.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">2. Descrição do Serviço</h3>
            <p>O Bingo2Gether é um aplicativo web de metas financeiras gamificadas para duas pessoas. Ele não é um serviço financeiro, não realiza investimentos e não oferece consultoria financeira.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">3. Contas e Responsabilidade</h3>
            <p>Você é responsável por manter a segurança de sua conta e senha. Cada conta é pessoal e intransferível. O compartilhamento de conta com o parceiro(a) é feito exclusivamente pelo sistema de convites do app.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">4. Plano PRO e Pagamentos</h3>
            <p>O plano PRO é cobrado conforme o ciclo escolhido (mensal, anual ou vitalício). Os preços podem ser alterados com aviso prévio de 30 dias. Cobranças recorrentes são renovadas automaticamente até o cancelamento.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">5. Uso Aceitável</h3>
            <p>É proibido usar a plataforma para atividades ilegais, violar direitos de terceiros, ou tentar comprometer a segurança do sistema.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">6. Limitação de Responsabilidade</h3>
            <p>O Bingo2Gether não garante resultados financeiros específicos. A plataforma é uma ferramenta de organização e motivação, não um serviço de investimento ou planejamento financeiro profissional.</p>
          </section>

          {/* PRIVACIDADE */}
          <div className="border-t border-white/10 my-8" />
          <h2 className="text-xl font-black text-white/95">Política de Privacidade</h2>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">1. Dados Coletados</h3>
            <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>E-mail e nome (cadastro)</li>
              <li>Dados de progresso no jogo (metas, números sorteados)</li>
              <li>Informações de pagamento (processadas pelo Stripe — não armazenamos dados de cartão)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">2. Como Usamos seus Dados</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Manter e melhorar o serviço</li>
              <li>Sincronizar o progresso entre parceiros</li>
              <li>Enviar notificações relacionadas ao app (com seu consentimento)</li>
              <li>Processar pagamentos</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">3. Compartilhamento de Dados</h3>
            <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, exceto quando necessário para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Processamento de pagamentos (Stripe)</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">4. Segurança</h3>
            <p>Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Nenhum sistema é 100% seguro, mas empregamos medidas razoáveis para garantir a proteção das informações.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">5. Seus Direitos (LGPD)</h3>
            <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você pode solicitar acesso, correção ou exclusão de seus dados pessoais a qualquer momento pelo e-mail <a href="mailto:bingotwogether@gmail.com" className="text-purple-400 underline">bingotwogether@gmail.com</a>.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white/90 mb-2">6. Cookies</h3>
            <p>Utilizamos cookies essenciais para autenticação e funcionamento do app. Não utilizamos cookies de rastreamento de terceiros.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;
