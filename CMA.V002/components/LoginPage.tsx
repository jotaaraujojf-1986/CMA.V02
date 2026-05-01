import React, { useState } from 'react';

interface LoginPageProps {
  email: string;
  password: string;
  isLoading: boolean;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRegister: () => void;
}

export const LoginPage = ({
  email, password, isLoading,
  onEmailChange, onPasswordChange, onSubmit, onRegister,
}: LoginPageProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="sf-page">
      <div className="sf-bg" />
      <div className="sf-grid-overlay" />
      <div className="sf-orb sf-orb1" />
      <div className="sf-orb sf-orb2" />
      <div className="sf-orb sf-orb3" />

      <div className="sf-layout">

        {/* LEFT */}
        <div className="sf-left">
          <div className="sf-brand">
            <div className="sf-brand-logo">SF</div>
            <span className="sf-brand-name">Service<span>Flow</span></span>
          </div>

          <div className="sf-hero-tag">Gestão de ordens de serviço</div>

          <h1 className="sf-hero-title">
            O fluxo certo<br />
            da sua <em>operação</em>
          </h1>

          <p className="sf-hero-sub">
            Gerencie montagens, assistências e equipes com total controle — em tempo real, de qualquer lugar.
          </p>

          <div className="sf-stats">
            <div className="sf-stat-item">
              <span className="sf-stat-val">100%</span>
              <span className="sf-stat-lbl">Rastreabilidade</span>
            </div>
            <div className="sf-stat-divider" />
            <div className="sf-stat-item">
              <span className="sf-stat-val">360°</span>
              <span className="sf-stat-lbl">Visão da equipe</span>
            </div>
            <div className="sf-stat-divider" />
            <div className="sf-stat-item">
              <span className="sf-stat-val">0</span>
              <span className="sf-stat-lbl">OS perdidas</span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="sf-right">
          <div className="sf-form-card">

            {/* Logo mobile-only — visível apenas em telas < 960px */}
            <div className="sf-mobile-logo">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #1a6bff, #00d4ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 'bold', fontSize: 14, flexShrink: 0
              }}>SF</div>
              <span style={{ fontSize: 17, fontWeight: 'bold', color: '#f0f4ff' }}>
                Service<span style={{ color: '#00d4ff' }}>Flow</span>
              </span>
            </div>

            <div className="sf-form-header">
              <h2 className="sf-form-title">Bem-vindo de volta</h2>
              <p className="sf-form-sub">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={onSubmit}>

              <div className="sf-field">
                <label className="sf-field-label" htmlFor="sf-email">E-mail</label>
                <div className="sf-input-wrap">
                  <svg className="sf-input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <input
                    type="email" id="sf-email" placeholder="seu@email.com"
                    autoComplete="email" required
                    value={email} onChange={(e) => onEmailChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="sf-field">
                <div className="sf-field-row">
                  <label className="sf-field-label" htmlFor="sf-password" style={{ marginBottom: 0 }}>Senha</label>
                  <a href="#" className="sf-forgot">Esqueceu a senha?</a>
                </div>
                <div className="sf-input-wrap">
                  <svg className="sf-input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 7V5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="sf-password" placeholder="••••••••"
                    autoComplete="current-password" required
                    value={password} onChange={(e) => onPasswordChange(e.target.value)}
                  />
                  <button
                    type="button" className="sf-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title="Mostrar senha"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2l12 12M6.5 6.5A3 3 0 019.5 9.5M1 8s2.5-5 7-5c1.5 0 2.8.4 3.9 1M15 8s-2.5 5-7 5c-1.5 0-2.8-.4-3.9-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="sf-btn-login" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>

            </form>

            <div className="sf-divider-row">
              <div className="sf-divider-line" />
              <span className="sf-divider-text">Novo por aqui?</span>
              <div className="sf-divider-line" />
            </div>

            <button className="sf-btn-trial" onClick={onRegister}>
              Cadastre sua empresa
              <span className="sf-btn-trial-badge">14 dias grátis</span>
            </button>

            <div className="sf-form-footer">
              Ao entrar, você concorda com os<br />
              <a href="#">Termos de Uso</a> e <a href="#">Política de Privacidade</a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
