import React, { useState } from 'react';
import { PLAN_DEFINITIONS, PlanLimits } from '../utils/plans';
import { Check, ArrowLeft, Star, Zap, Building2 } from 'lucide-react';

interface UpgradePlanProps {
  currentPlan: string;
  onBack: () => void;
}

export const UpgradePlan: React.FC<UpgradePlanProps> = ({ currentPlan, onBack }) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const plans = [PLAN_DEFINITIONS.starter, PLAN_DEFINITIONS.pro, PLAN_DEFINITIONS.business];

  const getIcon = (id: string) => {
    switch (id) {
      case 'starter': return <Star className="text-blue-500 mb-4" size={40} />;
      case 'pro': return <Zap className="text-purple-500 mb-4" size={40} />;
      case 'business': return <Building2 className="text-orange-500 mb-4" size={40} />;
      default: return null;
    }
  };

  const handleUpgradeRequest = (plan: PlanLimits) => {
    // Para efeito de demonstração / MVP, simulamos um envio de e-mail ou alerta
    alert(`Sua solicitação para mudar para o plano ${plan.name} foi enviada para nossa equipe. Em breve entraremos em contato para finalizar!`);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planos e Limites</h2>
          <p className="text-gray-500">Faça o upgrade para liberar novos recursos e aumentar a capacidade da sua operação.</p>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex items-center">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${!isAnnual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Anual
            <span className="text-[10px] uppercase font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">2 meses grátis</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-8">
        {plans.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.id || 
                           (currentPlan.toLowerCase() === 'trial' && plan.id === 'pro');
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-white rounded-3xl p-8 border-2 transition-all hover:shadow-2xl ${
                isCurrent 
                  ? 'border-blue-500 shadow-xl scale-105 z-10' 
                  : 'border-gray-100 shadow-md hover:border-gray-300'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-md whitespace-nowrap">
                  Seu Plano Atual
                </div>
              )}
              
              <div className="text-center border-b border-gray-100 pb-8 mb-8">
                <div className="flex justify-center">
                  {getIcon(plan.id)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex flex-col items-center">
                  {isAnnual && plan.priceAnual > 0 && (
                    <span className="text-sm text-gray-400 line-through mb-1">
                      R$ {plan.priceMensal}/mês
                    </span>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-gray-900">
                      R$ {isAnnual && plan.priceAnual > 0 ? Math.round(plan.priceAnual / 12) : plan.priceMensal}
                    </span>
                    <span className="text-gray-500 font-medium">/mês</span>
                  </div>
                  {isAnnual && plan.priceAnual > 0 && (
                    <span className="text-xs font-bold text-green-600 mt-2">
                      Cobrado R$ {plan.priceAnual.toLocaleString('pt-BR')}/ano
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="font-bold text-gray-800 flex items-center justify-between">
                  Máximo de Técnicos: <span className="bg-gray-100 px-3 py-1 rounded-lg">{plan.maxTechnicians > 100 ? 'Ilimitado' : plan.maxTechnicians}</span>
                </p>
                <p className="font-bold text-gray-800 flex items-center justify-between">
                  Administradores: <span className="bg-gray-100 px-3 py-1 rounded-lg">{plan.maxAdmins > 100 ? 'Ilimitado' : plan.maxAdmins}</span>
                </p>
                
                <ul className="space-y-3 mt-6">
                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <Check size={18} className="text-green-500 shrink-0" /> OS de montagem e assistência
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <Check size={18} className="text-green-500 shrink-0" /> Acompanhamento em tempo real
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${plan.features.financialPanel ? 'text-gray-600' : 'text-gray-400 opacity-50 line-through'}`}>
                    <Check size={18} className={plan.features.financialPanel ? 'text-green-500 shrink-0' : 'text-gray-300 shrink-0'} /> Painel financeiro
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${plan.features.performanceRanking ? 'text-gray-600' : 'text-gray-400 opacity-50 line-through'}`}>
                    <Check size={18} className={plan.features.performanceRanking ? 'text-green-500 shrink-0' : 'text-gray-300 shrink-0'} /> Ranking de performance
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${plan.features.exportCsv ? 'text-gray-600' : 'text-gray-400 opacity-50 line-through'}`}>
                    <Check size={18} className={plan.features.exportCsv ? 'text-green-500 shrink-0' : 'text-gray-300 shrink-0'} /> Exportação de CSV
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${plan.features.customPeriodReports ? 'text-gray-600' : 'text-gray-400 opacity-50 line-through'}`}>
                    <Check size={18} className={plan.features.customPeriodReports ? 'text-green-500 shrink-0' : 'text-gray-300 shrink-0'} /> Relatórios entre períodos
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => handleUpgradeRequest(plan)}
                disabled={isCurrent}
                className={`w-full py-4 rounded-2xl font-bold transition-colors ${
                  isCurrent 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                }`}
              >
                {isCurrent ? 'Plano Atual' : 'Solicitar Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
