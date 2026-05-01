import React from 'react';
import { User, Notification } from '../types';
import { LogoSF } from '../App';
import { LayoutDashboard, List, PlusCircle, LogOut, Menu, X, UserCog, Bell, UserCircle, FileText, CloudOff, TrendingUp, Wrench, Star, Database } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  notifications: Notification[];
  isSyncing?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, currentView, onChangeView, onLogout, notifications, isSyncing }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const NavItem = ({ view, label, icon: Icon, badgeCount }: any) => {
    if (view === 'USERS' && currentUser.role !== 'ADMIN' && currentUser.role !== 'ASSISTANT') return null;
    if (view === 'NEW' && currentUser.role !== 'ADMIN' && currentUser.role !== 'ASSISTANT') return null;
    if (view === 'DASHBOARD' && currentUser.role === 'CLIENT') return null;
    if (view === 'PRODUCTIVITY' && currentUser.role !== 'ADMIN') return null;
    if (view === 'ASSISTANCE_REPORTS' && currentUser.role !== 'ADMIN') return null;
    if (view === 'UPGRADE_PLAN' && currentUser.role !== 'ADMIN') return null;
    if (view === 'SUPERADMIN' && currentUser.role !== 'SUPERADMIN') return null;

    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          onChangeView(view);
          setIsMobileMenuOpen(false);
        }}
        style={isActive ? {
          background: 'linear-gradient(135deg, #1a6bff 0%, #2979ff 100%)',
          boxShadow: '0 4px 16px rgba(26,107,255,.35)',
          color: '#fff',
          position: 'relative',
        } : {}}
        className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium
          ${isActive
            ? 'text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
      >
        {isActive && (
          <span style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 18, background: 'linear-gradient(135deg, #1a6bff, #00d4ff)',
            borderRadius: '0 2px 2px 0'
          }} />
        )}
        <Icon size={18} className="shrink-0" />
        <span className="truncate">{label}</span>
        {badgeCount > 0 && (
          <span style={{ background: 'var(--cyan)', color: '#0a0f1e' }}
            className="absolute right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    /* sf-app — dark theme wrapper, all CSS overrides apply inside here */
    <div className="sf-app flex h-screen overflow-hidden" style={{ background: 'var(--navy)' }}>

      {/* Fixed background layers */}
      <div className="sf-bg-layer" />
      <div className="sf-grid-bg" />

      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0 relative z-10"
        style={{
          background: 'rgba(10,15,30,.7)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,.07)',
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #1a6bff, #00d4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0,
              boxShadow: '0 0 20px rgba(26,107,255,.3)',
              fontFamily: '"Outfit", sans-serif'
            }}>SF</div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f0f4ff', letterSpacing: '-.02em', fontFamily: '"Outfit", sans-serif' }}>
              Service<span style={{ color: '#00d4ff' }}>Flow</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--hint)' }}>
            Principal
          </p>
          <NavItem view="DASHBOARD"   label="Dashboard"           icon={LayoutDashboard} />
          <NavItem view="GENERATED"   label="Ordens Geradas"      icon={FileText} />
          <NavItem view="PRODUCTIVITY" label="Produt. (Montagem)"  icon={TrendingUp} />
          <NavItem view="ASSISTANCE_REPORTS" label="Produt. (Assistência)" icon={Wrench} />

          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mt-8 mb-3" style={{ color: 'var(--hint)' }}>
            Operação
          </p>
          <NavItem view="NEW"          label="Nova O.S."           icon={PlusCircle} />
          <NavItem view="NOTIFICATIONS" label="Notificações"       icon={Bell} badgeCount={unreadCount} />
          <NavItem view="USERS"        label="Usuários"            icon={UserCog} />
          <NavItem view="UPGRADE_PLAN" label="Planos de Acesso"    icon={Star} />
          <NavItem view="SUPERADMIN"   label="Gestão Global"       icon={Database} />
        </nav>

        {/* Footer: User + Logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => onChangeView('PROFILE')}
              className="flex items-center gap-3 flex-1 text-left overflow-hidden p-2 rounded-xl transition-all"
              style={currentView === 'PROFILE'
                ? { background: 'rgba(26,107,255,.15)', border: '1px solid rgba(26,107,255,.3)' }
                : { border: '1px solid transparent' }}
            >
              <img
                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=1a6bff&color=fff`}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                style={{ border: '2px solid rgba(255,255,255,.12)' }}
              />
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--sf-white)' }}>
                  {currentUser.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {currentUser.role === 'ADMIN' ? 'Administrador'
                    : currentUser.role === 'TECHNICIAN' ? 'Técnico'
                    : currentUser.role === 'ASSISTANT' ? 'Assistente'
                    : 'Cliente'}
                </p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg transition-colors ml-1 shrink-0"
              style={{ color: 'var(--hint)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--sf-red)'; e.currentTarget.style.background = 'rgba(239,68,68,.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--hint)'; e.currentTarget.style.background = 'transparent' }}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER + CONTENT ── */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative z-10">

        {/* Mobile Topbar */}
        <header
          className="md:hidden h-16 flex items-center justify-between px-4 sticky top-0 z-30 flex-shrink-0"
          style={{
            background: 'rgba(10,15,30,.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,.07)',
          }}
        >
          <div className="flex items-center gap-2">
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #1a6bff, #00d4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
              fontFamily: '"Outfit", sans-serif'
            }}>SF</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', letterSpacing: '-.02em', fontFamily: '"Outfit", sans-serif' }}>
              Service<span style={{ color: '#00d4ff' }}>Flow</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeView('NOTIFICATIONS')}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }}
                />
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg"
              style={{ color: 'var(--muted)' }}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="absolute inset-0 z-40 flex flex-col p-4 md:hidden animate-fade-in"
            style={{ background: 'rgba(10,15,30,.97)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex justify-end mb-4">
              <button onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div
              onClick={() => { onChangeView('PROFILE'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 p-4 mb-4 rounded-xl cursor-pointer"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)' }}
            >
              <img
                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=1a6bff&color=fff`}
                alt="avatar"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-bold" style={{ color: 'var(--sf-white)' }}>{currentUser.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Editar Perfil</p>
              </div>
            </div>

            <nav className="space-y-1">
              <NavItem view="DASHBOARD"   label="Dashboard"           icon={LayoutDashboard} />
              <NavItem view="GENERATED"   label="Ordens Geradas"      icon={FileText} />
              <NavItem view="PRODUCTIVITY" label="Produt. (Montagem)"  icon={TrendingUp} />
              <NavItem view="ASSISTANCE_REPORTS" label="Produt. (Assistência)" icon={Wrench} />
              <NavItem view="NEW"          label="Nova O.S."           icon={PlusCircle} />
              <NavItem view="NOTIFICATIONS" label="Notificações"       icon={Bell} badgeCount={unreadCount} />
              <NavItem view="USERS"        label="Usuários"            icon={UserCog} />
              <NavItem view="UPGRADE_PLAN" label="Planos de Acesso"    icon={Star} />
              <NavItem view="SUPERADMIN"   label="Gestão Global"       icon={Database} />
            </nav>

            <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm"
                style={{ color: 'var(--sf-red)' }}
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative" style={{ background: 'transparent' }}>
          {isSyncing && (
            <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-50"
              style={{ background: 'rgba(26,107,255,.2)' }}>
              <div className="h-full animate-progress-indeterminate"
                style={{ background: 'linear-gradient(90deg, var(--blue), var(--cyan))' }} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
