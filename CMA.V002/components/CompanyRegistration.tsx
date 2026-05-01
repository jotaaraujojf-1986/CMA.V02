import React, { useEffect, useState } from 'react';
import { db } from '../services/db';

type PlanId = 'starter' | 'pro' | 'business';
type BillingCycle = 'monthly' | 'annual';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const PLANS: Record<PlanId, {
  name: string;
  description: string;
  monthly: number;
  annual: number;
  annualMonthlyEquivalent: number;
  features: string[];
  popular?: boolean;
}> = {
  starter: {
    name: 'Starter',
    description: 'Até 3 técnicos · 1 administrador',
    monthly: 149,
    annual: 1490,
    annualMonthlyEquivalent: 124,
    features: ['OS montagem e assistência', 'Ambientes e subtarefas', 'Tempo real', 'Perfil cliente', 'Notificações']
  },
  pro: {
    name: 'Pro',
    description: 'Até 10 técnicos · 3 administradores',
    monthly: 299,
    annual: 2990,
    annualMonthlyEquivalent: 249,
    features: ['Tudo do Starter', 'Produtividade financeira', 'Ranking de performance', 'Exportação CSV', 'Eventos de OS', 'Histórico de assistências'],
    popular: true
  },
  business: {
    name: 'Business',
    description: 'Técnicos e usuários ilimitados',
    monthly: 549,
    annual: 5490,
    annualMonthlyEquivalent: 458,
    features: ['Tudo do Pro', 'Impacto financeiro em OS', 'Relatórios personalizados', 'Audit log ilimitado', 'Suporte prioritário', 'Onboarding assistido']
  }
};

const TEAM_SIZE_OPTIONS = [
  { value: 1, label: '1 técnico' },
  { value: 2, label: '2 técnicos' },
  { value: 3, label: '3 técnicos' },
  { value: 5, label: '4 a 5 técnicos' },
  { value: 8, label: '6 a 10 técnicos' },
  { value: 15, label: '11 a 20 técnicos' },
  { value: 30, label: 'Mais de 20 técnicos' },
];

interface CompanyRegistrationProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

const fmt = (value: number) => `R$ ${Math.round(value).toLocaleString('pt-BR')}`;

const getPasswordStrength = (value: string) => {
  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[A-Z]/.test(value)) strength++;
  if (/[0-9]/.test(value)) strength++;
  if (/[^A-Za-z0-9]/.test(value)) strength++;
  return strength;
};

const strengthColors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
const strengthLabels = ['', 'Muito fraca', 'Fraca', 'Boa', 'Forte'];

const registerCss = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --navy:#0a0f1e;--navy2:#0f1629;--navy3:#141d35;
  --blue:#1a6bff;--blue2:#2979ff;--cyan:#00d4ff;--cyan2:#00b8d9;
  --white:#f0f4ff;--muted:#8892a4;--border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);
  --glow:rgba(26,107,255,.35);--gold:#f59e0b;--green:#10b981;
}

html,body{min-height:100%;background:var(--navy);font-family:'DM Sans',sans-serif;color:var(--white)}

.bg{position:fixed;inset:0;z-index:0;
  background:
    radial-gradient(ellipse 80% 60% at 70% 30%,rgba(26,107,255,.15) 0%,transparent 60%),
    radial-gradient(ellipse 50% 50% at 15% 70%,rgba(0,212,255,.1) 0%,transparent 55%),
    linear-gradient(165deg,var(--navy) 0%,#080d1a 100%)}
.grid-overlay{position:fixed;inset:0;z-index:0;
  background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)}
.orb{position:fixed;border-radius:50%;z-index:0;filter:blur(80px);pointer-events:none;animation:drift 12s ease-in-out infinite}
.orb1{width:350px;height:350px;background:rgba(26,107,255,.12);top:-80px;right:15%;animation-delay:0s}
.orb2{width:250px;height:250px;background:rgba(0,212,255,.08);bottom:10%;left:5%;animation-delay:-5s}
@keyframes drift{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-25px) scale(1.04)}}

.layout{position:relative;z-index:1;display:grid;grid-template-columns:1fr 520px;min-height:100vh}

.left{display:flex;flex-direction:column;justify-content:center;padding:60px 60px 60px 80px;border-right:1px solid var(--border)}

.brand{display:flex;align-items:center;gap:12px;margin-bottom:48px}
.brand-logo{width:44px;height:44px;background:linear-gradient(135deg,var(--blue) 0%,var(--cyan) 100%);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:#fff;box-shadow:0 0 28px var(--glow);position:relative;overflow:hidden}
.brand-logo::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.2) 0%,transparent 60%)}
.brand-name{font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;color:var(--white);letter-spacing:-.02em}
.brand-name span{color:var(--cyan)}

.left-title{font-family:'Outfit',sans-serif;font-size:clamp(28px,3vw,40px);font-weight:800;letter-spacing:-.03em;line-height:1.15;margin-bottom:12px}
.left-title em{font-style:normal;background:linear-gradient(135deg,var(--blue2) 0%,var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.left-sub{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:40px;max-width:380px}

.billing-toggle{display:flex;align-items:center;gap:0;background:rgba(255,255,255,.06);border:1px solid var(--border2);border-radius:100px;padding:4px;margin-bottom:32px;width:fit-content}
.btog{font-size:12px;font-weight:500;padding:7px 18px;border-radius:100px;cursor:pointer;transition:all .2s;color:var(--muted);border:none;background:transparent;font-family:'DM Sans',sans-serif}
.btog.on{background:var(--blue);color:#fff;box-shadow:0 4px 16px rgba(26,107,255,.4)}
.btog-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,.2);color:var(--green);font-size:10px;font-weight:600;padding:2px 7px;border-radius:100px;margin-left:6px;letter-spacing:.03em}

.plans{display:flex;flex-direction:column;gap:10px}
.plan-card{border:1px solid var(--border2);border-radius:14px;padding:16px 18px;cursor:pointer;transition:all .22s;background:rgba(255,255,255,.03);position:relative;overflow:hidden}
.plan-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .2s;background:linear-gradient(135deg,rgba(26,107,255,.1) 0%,rgba(0,212,255,.05) 100%)}
.plan-card:hover{border-color:rgba(26,107,255,.4);transform:translateX(4px)}
.plan-card:hover::before{opacity:1}
.plan-card.selected{border-color:var(--blue);background:rgba(26,107,255,.1);transform:translateX(4px)}
.plan-card.selected::before{opacity:1}
.plan-card.popular{border-color:rgba(26,107,255,.5)}
.popular-badge{display:inline-block;background:linear-gradient(135deg,var(--blue) 0%,var(--cyan) 100%);font-size:10px;font-weight:700;color:#fff;padding:3px 10px;border-radius:100px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
.plan-row{display:flex;align-items:center;gap:14px}
.plan-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--border2);flex-shrink:0;transition:all .2s;display:flex;align-items:center;justify-content:center}
.plan-card.selected .plan-radio{border-color:var(--blue);background:var(--blue)}
.plan-radio-dot{width:7px;height:7px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s}
.plan-card.selected .plan-radio-dot{opacity:1}
.plan-info{flex:1}
.plan-name{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:var(--white);margin-bottom:2px}
.plan-desc{font-size:12px;color:var(--muted);line-height:1.4}
.plan-price-wrap{text-align:right}
.plan-price{font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;color:var(--white);line-height:1}
.plan-price-old{font-size:11px;color:var(--muted);text-decoration:line-through;margin-bottom:1px}
.plan-period{font-size:11px;color:var(--muted)}
.plan-saving{font-size:10px;font-weight:600;color:var(--green);margin-top:2px}
.plan-features{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s}
.plan-card.selected .plan-features{max-height:200px;padding-top:10px}
.feat-chip{font-size:11px;background:rgba(255,255,255,.07);color:var(--muted);border-radius:6px;padding:3px 8px}
.plan-card.selected .feat-chip{background:rgba(26,107,255,.15);color:rgba(255,255,255,.7)}
.trial-note{font-size:12px;color:var(--muted);text-align:center;margin-top:16px}
.trial-note strong{color:var(--cyan)}

.right{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:40px 40px;background:rgba(255,255,255,.025);backdrop-filter:blur(20px)}
.form-card{width:100%;max-width:400px;animation:fadeUp .5s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.steps{display:flex;align-items:center;gap:0;margin-bottom:32px}
.step{display:flex;align-items:center;gap:8px}
.step-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;flex-shrink:0;transition:all .3s}
.step-circle.active{background:linear-gradient(135deg,var(--blue) 0%,var(--blue2) 100%);color:#fff;box-shadow:0 4px 16px rgba(26,107,255,.4)}
.step-circle.done{background:var(--green);color:#fff}
.step-circle.inactive{background:rgba(255,255,255,.08);color:var(--muted);border:1px solid var(--border2)}
.step-label{font-size:12px;font-weight:500;transition:color .3s}
.step-label.active{color:var(--white)}
.step-label.inactive{color:var(--muted)}
.step-line{flex:1;height:1px;background:var(--border2);margin:0 10px}
.step-line.done{background:var(--green)}

.form-title{font-family:'Outfit',sans-serif;font-size:24px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px}
.form-sub{font-size:13px;color:var(--muted);font-weight:300;margin-bottom:28px}

.field{margin-bottom:14px}
.field-label{display:block;font-size:11px;font-weight:500;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;margin-bottom:7px}
.input-wrap{position:relative}
.input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;transition:color .2s}
.input-wrap:focus-within .input-icon{color:var(--cyan)}
.field input,.field select{width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:10px;padding:12px 14px 12px 42px;font-size:13px;font-family:'DM Sans',sans-serif;color:var(--white);outline:none;transition:border-color .2s,box-shadow .2s,background .2s;-webkit-appearance:none}
.field input::placeholder,.field select option{color:rgba(255,255,255,.25);background:var(--navy2)}
.field input:focus,.field select:focus{border-color:rgba(26,107,255,.6);background:rgba(26,107,255,.07);box-shadow:0 0 0 3px rgba(26,107,255,.12)}
.field select{cursor:pointer;color-scheme:dark}
.field select option:checked{background:var(--blue);color:#fff}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field-row3{display:grid;grid-template-columns:1fr 2fr;gap:10px}

.selected-plan-chip{display:flex;align-items:center;gap:10px;background:rgba(26,107,255,.12);border:1px solid rgba(26,107,255,.3);border-radius:10px;padding:10px 14px;margin-bottom:18px}
.spc-dot{width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan);flex-shrink:0}
.spc-info{flex:1}
.spc-name{font-size:13px;font-weight:500;color:var(--white);margin:0 0 1px}
.spc-price{font-size:12px;color:var(--cyan)}
.spc-change{font-size:11px;color:var(--muted);text-decoration:underline;cursor:pointer}
.spc-change:hover{color:var(--white)}

.pwd-strength{margin-top:6px}
.pwd-bar{display:flex;gap:3px;margin-bottom:4px}
.pwd-seg{height:3px;flex:1;border-radius:2px;background:var(--border2);transition:background .3s}
.pwd-label{font-size:11px;color:var(--muted)}

.btn-main{width:100%;margin-top:20px;background:linear-gradient(135deg,var(--blue) 0%,var(--blue2) 100%);border:none;border-radius:10px;padding:14px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer;letter-spacing:.01em;position:relative;overflow:hidden;transition:transform .15s,box-shadow .15s,opacity .15s;box-shadow:0 6px 24px rgba(26,107,255,.4)}
.btn-main:hover{transform:translateY(-1px);box-shadow:0 10px 32px rgba(26,107,255,.5)}
.btn-main:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-back{width:100%;margin-top:8px;background:transparent;border:1px solid var(--border2);border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--muted);cursor:pointer;transition:all .15s}
.btn-back:hover{border-color:var(--border);color:var(--white)}

.form-footer{margin-top:20px;text-align:center;font-size:11px;color:rgba(255,255,255,.2);line-height:1.6}
.form-footer a{color:var(--muted);text-decoration:none}
.form-footer a:hover{color:var(--white)}
.already{text-align:center;margin-top:14px;font-size:13px;color:var(--muted)}
.already a{color:var(--cyan);text-decoration:none;font-weight:500}
.already a:hover{opacity:.8}

@media(max-width:960px){
  .layout{grid-template-columns:1fr}
  .left{display:none}
  .right{background:var(--navy);padding:32px 20px;min-height:100vh}
}

/* ===== PLAN BOTTOM SHEET ===== */
.ps-overlay{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.65);opacity:0;transition:opacity .3s;pointer-events:none}
.ps-overlay.open{opacity:1;pointer-events:auto}

.ps-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--navy2);border-radius:20px 20px 0 0;transform:translateY(100%);transition:transform .35s cubic-bezier(.32,.72,0,1);max-height:92vh;overflow-y:auto;box-shadow:0 -10px 60px rgba(0,0,0,.5)}
.ps-sheet.open{transform:translateY(0)}

.ps-handle{width:36px;height:4px;border-radius:4px;background:rgba(255,255,255,.18);margin:12px auto 0}

.ps-header{padding:20px 24px 0;text-align:center}
.ps-title{font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;color:var(--white);margin-bottom:4px}
.ps-subtitle{font-size:13px;color:var(--muted);margin-bottom:20px}

.ps-toggle{display:flex;align-items:center;gap:0;background:rgba(255,255,255,.06);border:1px solid var(--border2);border-radius:100px;padding:3px;margin:0 auto 20px;width:fit-content}
.ps-tbtn{font-size:12px;font-weight:500;padding:7px 18px;border-radius:100px;cursor:pointer;transition:all .2s;color:var(--muted);border:none;background:transparent;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px}
.ps-tbtn.on{background:var(--blue);color:#fff;box-shadow:0 4px 16px rgba(26,107,255,.4)}
.ps-tbtn-badge{font-size:9px;font-weight:700;background:rgba(16,185,129,.2);color:var(--green);padding:2px 6px;border-radius:100px;letter-spacing:.03em}

.ps-plans{display:flex;flex-direction:column;gap:10px;padding:0 20px}

.ps-card{border:1px solid var(--border2);border-radius:14px;padding:14px 16px;cursor:pointer;transition:all .22s;background:rgba(255,255,255,.03);position:relative;overflow:hidden}
.ps-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .2s;background:linear-gradient(135deg,rgba(26,107,255,.1) 0%,rgba(0,212,255,.05) 100%)}
.ps-card:hover{border-color:rgba(26,107,255,.4)}
.ps-card:hover::before{opacity:1}
.ps-card.ps-selected{border-color:var(--blue);background:rgba(26,107,255,.1)}
.ps-card.ps-selected::before{opacity:1}

.ps-card-row{display:flex;align-items:center;gap:12px;position:relative;z-index:1}
.ps-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ps-card.ps-selected .ps-radio{border-color:var(--blue);background:var(--blue)}
.ps-radio-dot{width:7px;height:7px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s}
.ps-card.ps-selected .ps-radio-dot{opacity:1}
.ps-card-info{flex:1;min-width:0}
.ps-card-name{font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:var(--white);line-height:1.2}
.ps-card-desc{font-size:11px;color:var(--muted);margin-top:2px}
.ps-pop-badge{display:block;margin-top:4px}
.ps-pop-badge span{font-size:9px;font-weight:700;background:linear-gradient(135deg,var(--blue) 0%,var(--cyan) 100%);color:#fff;padding:2px 8px;border-radius:100px;letter-spacing:.04em;text-transform:uppercase}
.ps-card-price{text-align:right;flex-shrink:0}
.ps-card-price-old{font-size:11px;color:var(--muted);text-decoration:line-through;line-height:1}
.ps-card-price-val{font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;color:var(--white);line-height:1.2}
.ps-card-price-val small{font-size:11px;font-weight:400;color:var(--muted)}
.ps-card-price-note{font-size:10px;color:var(--green);font-weight:600;margin-top:1px}

.ps-card-feats{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);max-height:0;overflow:hidden;transition:max-height .3s,padding .3s;position:relative;z-index:1}
.ps-card.ps-selected .ps-card-feats{max-height:200px;padding-top:10px}
.ps-feat{font-size:10px;background:rgba(26,107,255,.15);color:rgba(255,255,255,.7);border-radius:5px;padding:3px 7px}

.ps-footer{padding:16px 20px 28px;position:sticky;bottom:0;background:linear-gradient(to top,var(--navy2) 60%,transparent)}
.ps-confirm{width:100%;background:linear-gradient(135deg,var(--blue) 0%,var(--blue2) 100%);border:none;border-radius:12px;padding:14px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer;box-shadow:0 6px 24px rgba(26,107,255,.4);transition:transform .15s,box-shadow .15s}
.ps-confirm:hover{transform:translateY(-1px);box-shadow:0 10px 32px rgba(26,107,255,.5)}
`;

export const CompanyRegistration: React.FC<CompanyRegistrationProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [sheetPlan, setSheetPlan] = useState<PlanId>(selectedPlan);
  const [sheetBilling, setSheetBilling] = useState<BillingCycle>(billing);

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [selectedState, setSelectedState] = useState('MG');
  const [selectedCity, setSelectedCity] = useState('');
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [teamSize, setTeamSize] = useState(3);

  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrength(adminPassword);
  const selectedPlanData = PLANS[selectedPlan];
  const selectedPrice = billing === 'annual'
    ? `${fmt(selectedPlanData.annualMonthlyEquivalent)}/mês (anual)`
    : `${fmt(selectedPlanData.monthly)}/mês`;

  const getPlanPrice = (planId: PlanId) => billing === 'annual' ? PLANS[planId].annualMonthlyEquivalent : PLANS[planId].monthly;

  useEffect(() => {
    if (!selectedState) {
      setCitiesList([]);
      setSelectedCity('');
      return;
    }

    setIsCitiesLoading(true);
    setSelectedCity('');
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
      .then(response => response.json())
      .then((data: { nome: string }[]) => setCitiesList(data.map(city => city.nome)))
      .catch(() => setCitiesList([]))
      .finally(() => setIsCitiesLoading(false));
  }, [selectedState]);

  const handleNextStep = (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyName || !companyEmail) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (adminPassword !== confirmPassword) {
      alert('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }
    if (adminPassword.length < 8) {
      alert('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!acceptedTerms) {
      alert('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setIsLoading(true);
    try {
      const loginEmail = companyEmail;
      const cityValue = selectedCity ? `${selectedCity} - ${selectedState}` : selectedState;

      const { error } = await db.registerCompany(
        companyName,
        adminName,
        loginEmail,
        adminPassword,
        cityValue,
        teamSize,
        selectedPlan,
        billing
      );

      if (error) throw error;

      const { user, error: loginErr } = await db.login(loginEmail, adminPassword);
      if (loginErr || !user) throw loginErr;

      onSuccess(user);
    } catch (error: any) {
      let errorMsg = error?.message || 'Erro desconhecido';
      if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
        errorMsg = 'Este e-mail já está em uso por outra conta. Por favor, utilize um e-mail diferente para a nova empresa.';
      }
      alert(`Erro ao criar conta: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{registerCss}</style>
      <div className="bg"></div>
      <div className="grid-overlay"></div>
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>

      <div className="layout">
        <div className="left">
          <div className="brand">
            <div className="brand-logo">SF</div>
            <span className="brand-name">Service<span>Flow</span></span>
          </div>

          <h1 className="left-title">Escolha o plano<br />ideal para <em>sua equipe</em></h1>
          <p className="left-sub">14 dias grátis em todos os planos. Sem cartão de crédito. Cancele quando quiser.</p>

          <div className="billing-toggle">
            <button className={`btog ${billing === 'monthly' ? 'on' : ''}`} type="button" onClick={() => setBilling('monthly')}>Mensal</button>
            <button className={`btog ${billing === 'annual' ? 'on' : ''}`} type="button" onClick={() => setBilling('annual')}>
              Anual <span className="btog-badge">2 meses grátis</span>
            </button>
          </div>

          <div className="plans">
            {(Object.keys(PLANS) as PlanId[]).map(planId => {
              const plan = PLANS[planId];
              const isSelected = selectedPlan === planId;
              return (
                <div
                  className={`plan-card ${plan.popular ? 'popular' : ''} ${isSelected ? 'selected' : ''}`}
                  key={planId}
                  onClick={() => setSelectedPlan(planId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedPlan(planId);
                  }}
                >
                  <div className="plan-row">
                    <div className="plan-radio"><div className="plan-radio-dot"></div></div>
                    <div className="plan-info">
                      <p className="plan-name">
                        {plan.name}
                        {plan.popular && <span className="popular-badge" style={{ fontSize: 9, padding: '2px 7px', verticalAlign: 'middle', marginLeft: 4 }}>Popular</span>}
                      </p>
                      <p className="plan-desc">{plan.description}</p>
                    </div>
                    <div className="plan-price-wrap">
                      <p className="plan-price-old">{billing === 'annual' ? `${fmt(plan.monthly)}/mês` : ''}</p>
                      <p className="plan-price">
                        {fmt(getPlanPrice(planId))}
                        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>/mês</span>
                      </p>
                      <p className="plan-saving">{billing === 'annual' ? `Cobrado ${fmt(plan.annual)}/ano` : ''}</p>
                    </div>
                  </div>
                  <div className="plan-features">
                    {plan.features.map(feature => <span className="feat-chip" key={feature}>{feature}</span>)}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="trial-note">🎉 Todos os planos incluem <strong>14 dias grátis</strong> com acesso completo ao Pro</p>
        </div>

        <div className="right">
          <div className="form-card">
            <div className="steps">
              <div className="step">
                <div className={`step-circle ${step === 1 ? 'active' : 'done'}`}>{step === 1 ? '1' : '✓'}</div>
                <span className={`step-label ${step === 1 ? 'active' : 'inactive'}`}>Empresa</span>
              </div>
              <div className={`step-line ${step === 2 ? 'done' : ''}`}></div>
              <div className="step">
                <div className={`step-circle ${step === 2 ? 'active' : 'inactive'}`}>2</div>
                <span className={`step-label ${step === 2 ? 'active' : 'inactive'}`}>Acesso</span>
              </div>
            </div>

            {step === 1 ? (
              <div>
                <h2 className="form-title">Cadastre sua empresa</h2>
                <p className="form-sub">Dados do seu negócio — Passo 1 de 2</p>

                <div className="selected-plan-chip">
                  <div className="spc-dot"></div>
                  <div className="spc-info">
                    <p className="spc-name">Plano {selectedPlanData.name} selecionado</p>
                    <p className="spc-price">{selectedPrice} — 14 dias grátis</p>
                  </div>
                  <span className="spc-change" onClick={() => { setSheetPlan(selectedPlan); setSheetBilling(billing); setShowPlanSheet(true); }}>Trocar</span>
                </div>

                <form onSubmit={handleNextStep}>
                  <div className="field">
                    <label className="field-label">Nome da empresa *</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" /></svg>
                      <input type="text" placeholder="Ex: Planejados Silva Ltda." required value={companyName} onChange={event => setCompanyName(event.target.value)} />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">E-mail profissional *</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" /><path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.2" /></svg>
                      <input type="email" placeholder="contato@suaempresa.com" required value={companyEmail} onChange={event => setCompanyEmail(event.target.value)} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Este será o login do administrador</p>
                  </div>

                  <div className="field-row3">
                    <div className="field">
                      <label className="field-label">Estado</label>
                      <div className="input-wrap">
                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M8 1v2M8 11v4M1 7h2M11 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".4" /></svg>
                        <select value={selectedState} onChange={event => setSelectedState(event.target.value)}>
                          <option value="">UF</option>
                          {ESTADOS.map(uf => <option value={uf} key={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Cidade {isCitiesLoading ? '(carregando...)' : ''}</label>
                      <div className="input-wrap">
                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5.8 2 4 3.8 4 6c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.2" /><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" /></svg>
                        <select value={selectedCity} onChange={event => setSelectedCity(event.target.value)} disabled={!selectedState || isCitiesLoading}>
                          <option value="">{!selectedState ? 'Selecione o estado' : 'Selecione a cidade'}</option>
                          {citiesList.map(city => <option value={city} key={city}>{city}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Tamanho da equipe técnica</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1 13c0-2.8 2.2-5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="11.5" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M9 13c0-2 1.1-3.7 2.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      <select value={teamSize} onChange={event => setTeamSize(Number(event.target.value))}>
                        {TEAM_SIZE_OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn-main">Continuar →</button>
                </form>

                <p className="already">Já tem conta? <a href="#login" onClick={(event) => { event.preventDefault(); onCancel(); }}>Entrar</a></p>
              </div>
            ) : (
              <div>
                <h2 className="form-title">Crie sua senha</h2>
                <p className="form-sub">Defina uma senha segura para o administrador</p>

                <div className="selected-plan-chip">
                  <div className="spc-dot"></div>
                  <div className="spc-info">
                    <p className="spc-name">Plano {selectedPlanData.name}</p>
                    <p className="spc-price">14 dias grátis · sem cartão de crédito</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>✓ Trial ativado</span>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label className="field-label">Nome do responsável *</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      <input type="text" placeholder="Seu nome completo" required value={adminName} onChange={event => setAdminName(event.target.value)} />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Senha *</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 7V5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" required value={adminPassword} onChange={event => setAdminPassword(event.target.value)} />
                      <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }} onClick={() => setShowPassword(value => !value)}>👁</button>
                    </div>
                    <div className="pwd-strength">
                      <div className="pwd-bar">
                        {[1, 2, 3, 4].map(index => (
                          <div className="pwd-seg" key={index} style={{ background: index <= strength ? strengthColors[strength] : 'var(--border2)' }}></div>
                        ))}
                      </div>
                      <span className="pwd-label" style={{ color: strength > 0 ? strengthColors[strength] : 'var(--muted)' }}>
                        {adminPassword.length > 0 ? strengthLabels[strength] : 'Digite uma senha segura'}
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Confirmar senha *</label>
                    <div className="input-wrap">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 7V5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      <input type="password" placeholder="Repita a senha" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                    <input type="checkbox" required checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--blue)', flexShrink: 0 }} />
                    <label style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                      Li e concordo com os <a href="#" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Termos de Uso</a> e a <a href="#" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Política de Privacidade</a>
                    </label>
                  </div>

                  <button type="submit" className="btn-main" disabled={isLoading}>{isLoading ? 'Criando sua conta...' : 'Criar minha conta 🚀'}</button>
                  <button type="button" className="btn-back" onClick={() => setStep(1)}>← Voltar</button>
                </form>
              </div>
            )}

            <div className="form-footer">
              Seus dados são protegidos pela <strong>LGPD</strong> e criptografados em trânsito
            </div>
          </div>
        </div>
      </div>
      {/* ===== PLAN BOTTOM SHEET ===== */}
      <div className={`ps-overlay ${showPlanSheet ? 'open' : ''}`} onClick={() => setShowPlanSheet(false)} />
      <div className={`ps-sheet ${showPlanSheet ? 'open' : ''}`}>
        <div className="ps-handle" />
        <div className="ps-header">
          <h3 className="ps-title">Escolha seu plano</h3>
          <p className="ps-subtitle">14 dias grátis em todos · sem cartão</p>
        </div>

        <div className="ps-toggle">
          <button type="button" className={`ps-tbtn ${sheetBilling === 'monthly' ? 'on' : ''}`} onClick={() => setSheetBilling('monthly')}>Mensal</button>
          <button type="button" className={`ps-tbtn ${sheetBilling === 'annual' ? 'on' : ''}`} onClick={() => setSheetBilling('annual')}>
            Anual <span className="ps-tbtn-badge">2 meses grátis</span>
          </button>
        </div>

        <div className="ps-plans">
          {(Object.keys(PLANS) as PlanId[]).map(planId => {
            const plan = PLANS[planId];
            const isSelected = sheetPlan === planId;
            const price = sheetBilling === 'annual' ? plan.annualMonthlyEquivalent : plan.monthly;
            return (
              <div
                className={`ps-card ${isSelected ? 'ps-selected' : ''}`}
                key={planId}
                onClick={() => setSheetPlan(planId)}
              >
                <div className="ps-card-row">
                  <div className="ps-radio"><div className="ps-radio-dot" /></div>
                  <div className="ps-card-info">
                    <p className="ps-card-name">{plan.name}</p>
                    <p className="ps-card-desc">{plan.description}</p>
                    {plan.popular && <div className="ps-pop-badge"><span>Mais popular</span></div>}
                  </div>
                  <div className="ps-card-price">
                    {sheetBilling === 'annual' && <p className="ps-card-price-old">{fmt(plan.monthly)}/mês</p>}
                    <p className="ps-card-price-val">{fmt(price)}<small>/mês</small></p>
                    {sheetBilling === 'annual' && <p className="ps-card-price-note">Cobrado {fmt(plan.annual)}/ano</p>}
                  </div>
                </div>
                <div className="ps-card-feats">
                  {plan.features.map(f => <span className="ps-feat" key={f}>{f}</span>)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="ps-footer">
          <button
            type="button"
            className="ps-confirm"
            onClick={() => {
              setSelectedPlan(sheetPlan);
              setBilling(sheetBilling);
              setShowPlanSheet(false);
            }}
          >
            Confirmar plano
          </button>
        </div>
      </div>
    </>
  );
};
