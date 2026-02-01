import React from 'react';
import { User, Notification } from '../types';
import { LayoutDashboard, List, PlusCircle, LogOut, Menu, X, UserCog, Bell, UserCircle, FileText, Cloud, CloudOff } from 'lucide-react';

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
    if (view === 'USERS' && currentUser.role !== 'ADMIN') return null;
    if (view === 'NEW' && currentUser.role !== 'ADMIN') return null;
    if (view === 'DASHBOARD' && currentUser.role === 'CLIENT') return null;

    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          onChangeView(view);
          setIsMobileMenuOpen(false);
        }}
        className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
          ${isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
          }`}
      >
        <Icon size={20} />
        <span>{label}</span>
        {badgeCount > 0 && (
          <span className="absolute right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-4">
        <div className="mb-8 px-4 flex items-center justify-between">
           <h1 className="font-extrabold text-2xl text-blue-600 tracking-tighter">C.M.A</h1>
           <div title="Sincronizado com Supabase" className={`${isSyncing ? 'animate-pulse text-blue-400' : 'text-green-500'}`}>
              <Cloud size={16} />
           </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem view="DASHBOARD" label="Dashboard" icon={LayoutDashboard} />
          <NavItem view="GENERATED" label="Ordens Geradas" icon={FileText} />
          <NavItem view="NEW" label="Nova O.S." icon={PlusCircle} />
          <NavItem view="NOTIFICATIONS" label="Notificações" icon={Bell} badgeCount={unreadCount} />
          <NavItem view="USERS" label="Usuários" icon={UserCog} />
        </nav>

        <div className="border-t pt-4">
          <button 
            onClick={() => onChangeView('PROFILE')}
            className={`w-full flex items-center gap-3 px-4 mb-4 p-2 rounded-lg transition-colors text-left group
              ${currentView === 'PROFILE' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
          >
            <img src={currentUser.avatarUrl || 'https://via.placeholder.com/40'} alt="avatar" className="w-10 h-10 rounded-full bg-gray-200 border border-gray-200 object-cover" />
            <div className="overflow-hidden">
              <p className={`text-sm font-bold truncate ${currentView === 'PROFILE' ? 'text-blue-800' : 'text-gray-800'}`}>
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'TECHNICIAN' ? 'Técnico' : 'Cliente'}</p>
            </div>
          </button>
          
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-full w-full">
        <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-30">
           <div className="flex items-center gap-2">
             <div className="font-extrabold text-xl text-blue-600 tracking-tighter">C.M.A</div>
             <div className={`${isSyncing ? 'animate-pulse text-blue-400' : 'text-green-500'}`}>
                <Cloud size={14} />
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <button onClick={() => onChangeView('NOTIFICATIONS')} className="relative p-2 text-gray-600">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
             </button>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
               {isMobileMenuOpen ? <X /> : <Menu />}
             </button>
           </div>
        </header>

        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-40 bg-white flex flex-col p-4 md:hidden animate-fade-in">
             <div className="flex justify-end mb-4">
                <button onClick={() => setIsMobileMenuOpen(false)}><X /></button>
             </div>
             
             <div 
               onClick={() => { onChangeView('PROFILE'); setIsMobileMenuOpen(false); }}
               className="flex items-center gap-3 p-4 mb-4 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100"
             >
                <img src={currentUser.avatarUrl || 'https://via.placeholder.com/40'} alt="avatar" className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                <div>
                  <p className="font-bold text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500">Editar Perfil</p>
                </div>
             </div>

             <nav className="space-y-2">
                <NavItem view="DASHBOARD" label="Dashboard" icon={LayoutDashboard} />
                <NavItem view="GENERATED" label="Ordens Geradas" icon={FileText} />
                <NavItem view="NEW" label="Nova O.S." icon={PlusCircle} />
                <NavItem view="NOTIFICATIONS" label="Notificações" icon={Bell} badgeCount={unreadCount} />
                <NavItem view="USERS" label="Usuários" icon={UserCog} />
             </nav>
             <div className="mt-auto border-t pt-4">
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 text-red-600 font-medium">
                  <LogOut /> Sair
                </button>
             </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {isSyncing && (
             <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden z-50">
                <div className="h-full bg-blue-600 animate-progress-indeterminate"></div>
             </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};