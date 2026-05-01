export type PlanKey = 'starter' | 'pro' | 'business' | 'trial';

export interface PlanLimits {
  id: PlanKey;
  name: string;
  priceMensal: number;
  priceAnual: number;
  maxTechnicians: number;
  maxAdmins: number;
  features: {
    financialPanel: boolean;
    performanceRanking: boolean;
    exportCsv: boolean;
    customPeriodReports: boolean;
    realtimeTracking: boolean;
    notifications: boolean;
    clientProfile: boolean;
  };
}

export const PLAN_DEFINITIONS: Record<PlanKey, PlanLimits> = {
  starter: {
    id: 'starter',
    name: 'STARTER',
    priceMensal: 149.00,
    priceAnual: 1490.00,
    maxTechnicians: 3,
    maxAdmins: 1,
    features: {
      financialPanel: false,
      performanceRanking: false,
      exportCsv: false,
      customPeriodReports: false,
      realtimeTracking: true,
      notifications: true,
      clientProfile: true
    }
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    priceMensal: 299.00,
    priceAnual: 2990.00,
    maxTechnicians: 10,
    maxAdmins: 3,
    features: {
      financialPanel: true,
      performanceRanking: true,
      exportCsv: true,
      customPeriodReports: false,
      realtimeTracking: true,
      notifications: true,
      clientProfile: true
    }
  },
  business: {
    id: 'business',
    name: 'BUSINESS',
    priceMensal: 549.00,
    priceAnual: 5490.00,
    maxTechnicians: 9999, // ilimitado na prática
    maxAdmins: 9999, // ilimitado na prática
    features: {
      financialPanel: true,
      performanceRanking: true,
      exportCsv: true,
      customPeriodReports: true,
      realtimeTracking: true,
      notifications: true,
      clientProfile: true
    }
  },
  trial: {
    id: 'trial',
    name: 'TRIAL (Teste)',
    priceMensal: 0,
    priceAnual: 0,
    maxTechnicians: 10,
    maxAdmins: 3,
    features: {
      financialPanel: true,
      performanceRanking: true,
      exportCsv: true,
      customPeriodReports: false,
      realtimeTracking: true,
      notifications: true,
      clientProfile: true
    }
  }
};

/**
 * Retorna os limites e recursos disponíveis para o plano informado.
 */
export const getPlanLimits = (plan: string): PlanLimits => {
  const p = plan.toLowerCase() as PlanKey;
  return PLAN_DEFINITIONS[p] || PLAN_DEFINITIONS.starter;
};

/**
 * Checa se um plano possui um recurso específico.
 */
export const hasFeature = (plan: string, feature: keyof PlanLimits['features']): boolean => {
  const limits = getPlanLimits(plan);
  return limits.features[feature];
};

/**
 * Verifica se a empresa atingiu o limite de criação de determinado perfil
 */
export const hasReachedLimit = (plan: string, currentCount: number, role: 'TECHNICIAN' | 'ADMIN'): boolean => {
  const limits = getPlanLimits(plan);
  if (role === 'TECHNICIAN') return currentCount >= limits.maxTechnicians;
  if (role === 'ADMIN') return currentCount >= limits.maxAdmins;
  return false;
};
