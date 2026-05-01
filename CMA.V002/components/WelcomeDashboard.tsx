import React, { useEffect, useState } from 'react';
import { Building2, Users, FilePlus, UserPlus, Clock, Sparkles } from 'lucide-react';
import { db } from '../services/db';

interface WelcomeDashboardProps {
  onNavigate: (view: string) => void;
}

export const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({ onNavigate }) => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      const company = await db.getCurrentCompany();
      if (company && company.plano_expira_em) {
        const expirationDate = new Date(company.plano_expira_em);
        const today = new Date();
        const diffTime = expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays > 0 ? diffDays : 0);
      }
    };
    fetchCompanyInfo();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[32px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-400/20 blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
              <Sparkles size={16} className="text-yellow-300" />
              Conta Criada com Sucesso
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Bem-vindo ao <br />ServiceFlow!
            </h1>
            <p className="text-blue-100 text-lg md:text-xl max-w-xl">
              Você acabou de dar o primeiro passo para organizar sua operação de ponta a ponta.
            </p>
          </div>

          {daysRemaining !== null && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-center min-w-[200px]">
              <div className="flex justify-center mb-3 text-blue-200">
                <Clock size={32} />
              </div>
              <div className="text-5xl font-black mb-1">{daysRemaining}</div>
              <div className="text-sm font-bold text-blue-200 uppercase tracking-widest">
                Dias de Teste
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Próximos Passos</h2>
        <p className="text-gray-500">Configure sua conta para tirar o máximo proveito da plataforma.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card 1: Adicionar Técnicos */}
        <button onClick={() => onNavigate('USERS')} className="group text-left bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Adicionar seus técnicos</h3>
          <p className="text-gray-500 leading-relaxed">
            Cadastre a equipe de campo. Eles receberão acesso ao aplicativo para visualizar e atualizar as ordens de serviço.
          </p>
        </button>

        {/* Card 2: Nova OS */}
        <button onClick={() => onNavigate('NEW')} className="group text-left bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FilePlus size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Criar sua primeira O.S.</h3>
          <p className="text-gray-500 leading-relaxed">
            Abra uma nova ordem de montagem ou assistência técnica e distribua o serviço para a sua equipe.
          </p>
        </button>

        {/* Card 3: Assistente */}
        <button onClick={() => onNavigate('USERS')} className="group text-left bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UserPlus size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Convidar um assistente</h3>
          <p className="text-gray-500 leading-relaxed">
            Traga sua equipe de atendimento para ajudar a gerenciar a agenda e responder as dúvidas dos técnicos.
          </p>
        </button>
      </div>
    </div>
  );
};
