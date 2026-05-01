import React from 'react';
import { hasFeature, PlanLimits } from '../utils/plans';
import { Lock } from 'lucide-react';

interface FeatureGuardProps {
  currentPlan: string;
  feature: keyof PlanLimits['features'];
  children: React.ReactNode;
  onUpgradeRequest: () => void;
  featureName: string;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ 
  currentPlan, 
  feature, 
  children, 
  onUpgradeRequest,
  featureName
}) => {
  const isAllowed = hasFeature(currentPlan, feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <Lock size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3">
        Recurso Bloqueado
      </h3>
      <p className="text-slate-500 max-w-md mb-8">
        Este recurso ({featureName}) não está disponível no seu plano atual. 
        Faça o upgrade para acessar essa e outras funcionalidades exclusivas.
      </p>
      <button 
        onClick={onUpgradeRequest}
        className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
      >
        Ver Planos e Fazer Upgrade
      </button>
    </div>
  );
};
