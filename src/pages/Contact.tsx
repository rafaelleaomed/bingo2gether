import React from 'react';
import { ArrowLeft, Mail, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Contact: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0612] text-white/80" style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-12">
        <button onClick={() => navigate('/')} className="mb-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-2xl font-black text-white mb-2">Dados de Contato e Suporte</h1>
        <p className="text-white/30 text-sm mb-8">Estamos aqui para ajudar vocês.</p>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Mail size={20} className="text-purple-400" />
              </div>
              <h2 className="text-base font-bold text-white">E-mail de Suporte</h2>
            </div>
            <a href="mailto:bingotwogether@gmail.com" className="text-purple-400 underline text-sm font-medium">
              bingotwogether@gmail.com
            </a>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Clock size={20} className="text-purple-400" />
              </div>
              <h2 className="text-base font-bold text-white">Tempo de Resposta</h2>
            </div>
            <p className="text-sm text-white/50 font-medium">Respondemos em até <strong className="text-white/70">48 horas</strong> em dias úteis.</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <MessageSquare size={20} className="text-purple-400" />
              </div>
              <h2 className="text-base font-bold text-white">Assuntos</h2>
            </div>
            <ul className="text-sm text-white/50 font-medium space-y-1.5 mt-1">
              <li>• Dúvidas sobre cobrança e pagamentos</li>
              <li>• Solicitação de reembolso</li>
              <li>• Problemas técnicos no app</li>
              <li>• Solicitações de dados pessoais (LGPD)</li>
              <li>• Sugestões e feedback</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 p-5 rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.03] text-center">
          <p className="text-xs text-yellow-300/60 font-bold">
            Bingo2Gether — Transformando metas em conquistas, juntos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
