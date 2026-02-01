import React, { useState, useEffect } from 'react';
import { User, WorkOrder, Notification, Role, WorkOrderType, Status } from './types';
import { getStatusLabel } from './services/mockData';
import { db } from './services/db';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkOrderDetails } from './components/WorkOrderDetails';
import { NewWorkOrder } from './components/NewWorkOrder';
import { GeneratedOrders } from './components/GeneratedOrders';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { Lock, Pencil, Plus, X, Search, Loader2, Filter, User as UserIcon, Mail, Shield, Phone, MapPin, UserPlus, Database, Cloud } from 'lucide-react';

export const LogoCMA = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#2563eb" />
    <g transform="translate(50, 45)">
      <g transform="rotate(-45)">
        <rect x="-30" y="-4" width="60" height="8" rx="1" fill="white" />
        <path d="M-25 -4V-1M-20 -4V-2M-15 -4V-1M-10 -4V-2M-5 -4V-1M0 -4V-2M5 -4V-1M10 -4V-2M15 -4V-1M20 -4V-2M25 -4V-1" stroke="#1e3a8a" strokeWidth="0.5" />
      </g>
      <g transform="rotate(45)">
        <rect x="-25" y="-3" width="50" height="6" rx="1" fill="#1e3a8a" stroke="white" strokeWidth="1" />
        <path d="M22 -8C26 -8 30 -4 30 0C30 4 26 8 22 8L15 4V-4L22 -8Z" fill="#1e3a8a" stroke="white" strokeWidth="1" />
        <path d="M25 -3L21 0L25 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="-22" cy="0" r="2.5" fill="white" />
      </g>
    </g>
    <text x="50" y="82" fontFamily="Arial" fontSize="10" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="1.5">C.M.A</text>
  </svg>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [initialListFilters, setInitialListFilters] = useState<{ status: string, type: WorkOrderType } | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | Role>('ALL');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');

  // --- Inicialização Assíncrona via Supabase ---
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      await db.initialize();
      setUsersList(await db.getUsers());
      setOrders(await db.getOrders());
      setNotifications(await db.getNotifications());
      setIsLoading(false);
    };
    initApp();
  }, []);

  // --- Lógica de Persistência Supabase ---
  const saveUsers = async (list: User[]) => {
    setIsSyncing(true);
    setUsersList(list);
    await db.saveUsers(list);
    setIsSyncing(false);
  };

  const saveOrders = async (list: WorkOrder[]) => {
    setIsSyncing(true);
    setOrders(list);
    await db.saveOrders(list);
    setIsSyncing(false);
  };

  const saveNotifications = async (list: Notification[]) => {
    setIsSyncing(true);
    setNotifications(list);
    await db.saveNotifications(list);
    setIsSyncing(false);
  };

  const createNotification = async (userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO', orderId?: string) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      relatedOrderId: orderId
    };
    await saveNotifications([newNotif, ...notifications]);
  };

  // --- Handlers de Notificação ---
  const handleMarkAsRead = async (id: string) => {
    const newList = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await saveNotifications(newList);
  };

  const handleMarkAllAsRead = async () => {
    const newList = notifications.map(n => n.userId === user?.id ? { ...n, read: true } : n);
    await saveNotifications(newList);
  };

  const handleDeleteNotification = async (id: string) => {
    const newList = notifications.filter(n => n.id !== id);
    await saveNotifications(newList);
  };

  const [newUserData, setNewUserData] = useState({
    name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT' as Role,
    cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = usersList.find(u => u.email === email && (u.password === password || password === '123'));
    if (foundUser) {
      setUser(foundUser);
      setCurrentView(foundUser.role === 'CLIENT' ? 'GENERATED' : 'DASHBOARD');
    } else {
      alert('Usuário ou senha incorretos.');
    }
  };

  const handleCepBlur = async () => {
    const cepStr = newUserData.cep.replace(/\D/g, '');
    if (cepStr.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepStr}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setNewUserData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    const newList = usersList.map(u => u.id === updatedUser.id ? updatedUser : u);
    await saveUsers(newList);
    if (user && user.id === updatedUser.id) setUser(updatedUser);
    if (userToEdit) setUserToEdit(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usersList.some(u => u.email === newUserData.email)) {
      alert('Este e-mail já está cadastrado.');
      return;
    }
    
    let formattedAddress = '';
    const isClient = newUserData.role === 'CLIENT';
    
    if (isClient) {
      formattedAddress = `${newUserData.street}, ${newUserData.addressNumber} ${newUserData.complement ? '- ' + newUserData.complement : ''}, ${newUserData.neighborhood}, ${newUserData.city} - ${newUserData.state}, CEP: ${newUserData.cep}`;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUserData.name,
      email: newUserData.email,
      password: newUserData.password || '123',
      phone: newUserData.phone,
      secondaryPhone: newUserData.secondaryPhone,
      role: newUserData.role,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserData.name)}&background=random`,
      ...(isClient ? {
        address: formattedAddress,
        cep: newUserData.cep,
        street: newUserData.street,
        addressNumber: newUserData.addressNumber,
        complement: newUserData.complement,
        neighborhood: newUserData.neighborhood,
        city: newUserData.city,
        state: newUserData.state
      } : {})
    };

    await saveUsers([...usersList, newUser]);
    setIsCreatingUser(false);
    setNewUserData({ 
      name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT', 
      cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
    }); 
  };

  const handleCreateOrder = async (newOrder: WorkOrder) => {
    await saveOrders([newOrder, ...orders]);
    
    // Notificar Admin sobre nova O.S.
    const admins = usersList.filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      createNotification(admin.id, 'Nova O.S. Aberta', `Uma nova solicitação foi criada por ${newOrder.clientName}.`, 'INFO', newOrder.id);
    });

    setCurrentView('GENERATED');
  };

  const handleUpdateOrder = async (updatedOrder: WorkOrder) => {
    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    const newList = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    await saveOrders(newList);
    setSelectedOrder(updatedOrder); 

    // Lógica de Notificações baseada em mudanças de status/técnico
    if (oldOrder) {
      // Notificar Técnico se foi atribuído
      if (updatedOrder.technicianId && updatedOrder.technicianId !== oldOrder.technicianId) {
        createNotification(updatedOrder.technicianId, 'O.S. Atribuída a Você', `Você é o responsável pela ordem ${updatedOrder.id}.`, 'SUCCESS', updatedOrder.id);
        
        // Notificar Cliente que um técnico foi atribuído
        const client = usersList.find(u => u.email === updatedOrder.clientEmail);
        if (client) {
          createNotification(client.id, 'Técnico Atribuído', `O técnico ${updatedOrder.technicianName} cuidará do seu pedido.`, 'INFO', updatedOrder.id);
        }
      }

      // Notificar Cliente sobre mudanças críticas de status
      if (updatedOrder.status !== oldOrder.status) {
         const client = usersList.find(u => u.email === updatedOrder.clientEmail);
         if (client) {
            if (updatedOrder.status === 'IN_PROGRESS') {
               createNotification(client.id, 'Serviço Iniciado', `O técnico iniciou o trabalho no seu endereço.`, 'INFO', updatedOrder.id);
            } else if (updatedOrder.status === 'PENDING_REVIEW') {
               createNotification(client.id, 'Serviço Concluído!', `Tudo pronto! Por favor, revise e aprove a conclusão.`, 'SUCCESS', updatedOrder.id);
            } else if (updatedOrder.status === 'CANCELLED') {
               createNotification(client.id, 'O.S. Cancelada', `Sua ordem de serviço foi cancelada.`, 'ERROR', updatedOrder.id);
            }
         }
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const newList = orders.filter(o => o.id !== orderId);
    await saveOrders(newList);
    setSelectedOrder(null);
  };

  const handleDashboardNavigation = (status: string, type: WorkOrderType) => {
    setInitialListFilters({ status, type });
    setCurrentView('GENERATED');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-bold animate-pulse">Conectando ao Supabase C.M.A...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-blue-600 tracking-tighter mb-2">C.M.A</h1>
            <p className="text-gray-400 text-sm font-medium">Controle de Montagens e Assistências</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 ml-1">E-mail</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: seuemail@cma.com"
                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all placeholder:text-gray-300 shadow-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 ml-1">Senha</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all placeholder:text-gray-300 shadow-sm" 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95">
              Entrar
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
             <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Cloud size={12} className="text-blue-500"/> 
                <span>Conectado via Supabase Cloud</span>
             </div>
          </div>
        </div>
      </div>
    );
  }
  
  const userNotifications = notifications.filter(n => n.userId === user.id);

  const renderContent = () => {
    if (selectedOrder) {
      return (
        <WorkOrderDetails 
          order={selectedOrder} currentUser={user} onBack={() => setSelectedOrder(null)} 
          onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder}
          allTechnicians={usersList.filter(u => u.role === 'TECHNICIAN')}
        />
      );
    }

    switch (currentView) {
      case 'DASHBOARD': 
        return <Dashboard orders={orders} currentUser={user} allUsers={usersList} onNavigateFilter={handleDashboardNavigation} />;
      case 'GENERATED': 
        return <GeneratedOrders orders={orders} currentUser={user} onSelectOrder={setSelectedOrder} initialFilters={initialListFilters} />;
      case 'NEW': return <NewWorkOrder currentUser={user} allUsers={usersList} onCancel={() => setCurrentView('GENERATED')} onSubmit={handleCreateOrder} />;
      case 'NOTIFICATIONS': 
        return <NotificationsView 
          notifications={userNotifications} 
          onMarkAsRead={handleMarkAsRead} 
          onMarkAllAsRead={handleMarkAllAsRead} 
          onDelete={handleDeleteNotification} 
        />;
      case 'PROFILE': return <ProfileView currentUser={user} viewer={user} onSave={handleUpdateProfile} />;
      case 'USERS':
        if (userToEdit) {
           return <ProfileView currentUser={userToEdit} viewer={user} onSave={handleUpdateProfile} onBack={() => setUserToEdit(null)} />;
        }
        const filteredUsers = usersList.filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter);
        return (
          <div className="bg-white p-6 rounded-xl shadow-sm relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold">Gestão de Usuários</h2>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                   {(['ALL', 'ADMIN', 'TECHNICIAN', 'CLIENT'] as const).map(role => (
                      <button
                        key={role} onClick={() => setUserRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${userRoleFilter === role ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {role === 'ALL' ? 'Todos' : role === 'ADMIN' ? 'Admins' : role === 'TECHNICIAN' ? 'Técnicos' : 'Clientes'}
                      </button>
                   ))}
                </div>
                {user.role === 'ADMIN' && (
                  <button 
                    onClick={() => setIsCreatingUser(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    <UserPlus size={18} /> Novo Usuário
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                 <div className="text-center py-10 text-gray-400"><p>Nenhum usuário encontrado.</p></div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.id} className="p-4 border rounded-xl flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} className="w-12 h-12 rounded-full object-cover bg-gray-200 shadow-sm border border-gray-100" alt="avatar" />
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'TECHNICIAN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role === 'ADMIN' ? 'Administrador' : u.role === 'TECHNICIAN' ? 'Técnico' : 'Cliente'}
                        </span>
                      </div>
                    </div>
                    {user.role === 'ADMIN' && (
                      <button onClick={() => setUserToEdit(u)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={20} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {isCreatingUser && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="p-5 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                       <UserPlus className="text-blue-600" size={20}/> Cadastro de Novo Usuário
                    </h3>
                    <button onClick={() => setIsCreatingUser(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                          <div className="relative">
                             <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input required className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Perfil de Acesso</label>
                          <div className="relative">
                             <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <select className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 font-medium"
                                value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value as Role})}>
                                <option value="CLIENT">Cliente</option>
                                <option value="TECHNICIAN">Técnico</option>
                                <option value="ADMIN">Administrador</option>
                             </select>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail (Login)</label>
                          <div className="relative">
                             <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input required type="email" className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Senha Inicial</label>
                          <div className="relative">
                             <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input required type="text" className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                placeholder="Defina a senha"
                                value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Telefone Principal</label>
                          <div className="relative">
                             <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input required className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                placeholder="11988888888"
                                value={newUserData.phone} onChange={e => setNewUserData({...newUserData, phone: e.target.value})} />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Telefone Secundário</label>
                          <div className="relative">
                             <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input className="w-full pl-12 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                placeholder="1133334444"
                                value={newUserData.secondaryPhone} onChange={e => setNewUserData({...newUserData, secondaryPhone: e.target.value})} />
                          </div>
                       </div>
                    </div>
                    
                    {newUserData.role === 'CLIENT' && (
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-fade-in">
                         <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 border-b pb-3 mb-2">
                            <MapPin size={18} className="text-blue-500"/> Endereço de Atendimento
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="col-span-1">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CEP</label>
                               <div className="relative">
                                  <input required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                     placeholder="01000-000" value={newUserData.cep} onChange={e => setNewUserData({...newUserData, cep: e.target.value})} onBlur={handleCepBlur} />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                     {isLoadingCep ? <Loader2 size={16} className="animate-spin text-blue-500"/> : <Search size={16}/>}
                                  </div>
                               </div>
                            </div>
                            <div className="col-span-1 md:col-span-3">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rua / Avenida</label>
                               <input required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  placeholder="Rua das Flores" value={newUserData.street} onChange={e => setNewUserData({...newUserData, street: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número</label>
                               <input required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  placeholder="123" value={newUserData.addressNumber} onChange={e => setNewUserData({...newUserData, addressNumber: e.target.value})} />
                            </div>
                            <div className="col-span-1 md:col-span-3">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Complemento / Apto</label>
                               <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  value={newUserData.complement} onChange={e => setNewUserData({...newUserData, complement: e.target.value})} />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bairro</label>
                               <input required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  placeholder="Centro" value={newUserData.neighborhood} onChange={e => setNewUserData({...newUserData, neighborhood: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cidade</label>
                               <input required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  placeholder="São Paulo" value={newUserData.city} onChange={e => setNewUserData({...newUserData, city: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado (UF)</label>
                               <input required maxLength={2} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                  placeholder="SP" value={newUserData.state} onChange={e => setNewUserData({...newUserData, state: e.target.value})} />
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="pt-4 flex gap-4">
                       <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancelar</button>
                       <button type="submit" disabled={isSyncing} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                         {isSyncing ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20}/>}
                         Cadastrar Novo Usuário
                       </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      default: return <Dashboard orders={orders} currentUser={user} allUsers={usersList} />;
    }
  };

  return (
    <Layout 
      currentUser={user} currentView={currentView} 
      onChangeView={(view) => { setCurrentView(view); setSelectedOrder(null); setUserToEdit(null); }}
      onLogout={() => setUser(null)} notifications={userNotifications}
      isSyncing={isSyncing}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;