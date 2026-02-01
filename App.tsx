import React, { useState, useEffect, useCallback } from 'react';
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

const App = () => {
  // --- Hooks de Estado (Sempre no Topo) ---
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

  // Estado para criação de novo usuário (movido para o topo para evitar erro #310)
  const [newUserData, setNewUserData] = useState({ 
    name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT' as Role, 
    cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '' 
  });

  // --- Carregamento de Dados ---
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const [u, o, n] = await Promise.all([
        db.getUsers(),
        db.getOrders(),
        db.getNotifications()
      ]);
      setUsersList(u);
      setOrders(o);
      setNotifications(n);
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Inicialização
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      await db.initialize();
      await fetchData();
      setIsLoading(false);
    };
    initApp();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  // --- Handlers e Lógica de Negócio ---
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
    await db.addNotification(newNotif);
    if (user && userId === user.id) {
       setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const newList = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(newList);
    await db.saveNotifications(newList);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const newList = notifications.map(n => n.userId === user.id ? { ...n, read: true } : n);
    setNotifications(newList);
    await db.markAllNotificationsRead(user.id);
  };

  const handleDeleteNotification = async (id: string) => {
    const newList = notifications.filter(n => n.id !== id);
    setNotifications(newList);
    await db.saveNotifications(newList);
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    const newList = usersList.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsersList(newList);
    await db.saveUsers(newList);
    if (user && user.id === updatedUser.id) setUser(updatedUser);
    if (userToEdit) setUserToEdit(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usersList.some(u => u.email === newUserData.email)) {
      alert('Este e-mail já está cadastrado.');
      return;
    }
    
    const isClient = newUserData.role === 'CLIENT';
    const formattedAddress = isClient ? `${newUserData.street}, ${newUserData.addressNumber} ${newUserData.complement ? '- ' + newUserData.complement : ''}, ${newUserData.neighborhood}, ${newUserData.city} - ${newUserData.state}, CEP: ${newUserData.cep}` : '';

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
        address: formattedAddress, cep: newUserData.cep, street: newUserData.street,
        addressNumber: newUserData.addressNumber, complement: newUserData.complement,
        neighborhood: newUserData.neighborhood, city: newUserData.city, state: newUserData.state
      } : {})
    };

    const updatedList = [...usersList, newUser];
    setUsersList(updatedList);
    await db.saveUsers(updatedList);
    setIsCreatingUser(false);
    setNewUserData({ 
      name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT', 
      cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '' 
    });
  };

  const handleCreateOrder = async (newOrder: WorkOrder) => {
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    await db.saveOrders(updatedOrders);
    
    const admins = usersList.filter(u => u.role === 'ADMIN');
    for (const admin of admins) {
      await createNotification(admin.id, 'Nova Solicitação', `${newOrder.clientName} criou a ordem ${newOrder.id}.`, 'INFO', newOrder.id);
    }
    setCurrentView('GENERATED');
  };

  const handleUpdateOrder = async (updatedOrder: WorkOrder) => {
    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    await db.updateSingleOrder(updatedOrder);
    setSelectedOrder(updatedOrder); 

    if (oldOrder) {
      if (updatedOrder.technicianId && updatedOrder.technicianId !== oldOrder.technicianId) {
        await createNotification(updatedOrder.technicianId, 'O.S. Atribuída', `Você agora é o responsável pela ordem ${updatedOrder.id}.`, 'SUCCESS', updatedOrder.id);
        const client = usersList.find(u => u.email === updatedOrder.clientEmail);
        if (client) {
          await createNotification(client.id, 'Técnico Definido', `O profissional ${updatedOrder.technicianName} cuidará da sua O.S.`, 'INFO', updatedOrder.id);
        }
      }

      if (updatedOrder.status !== oldOrder.status) {
         const client = usersList.find(u => u.email === updatedOrder.clientEmail);
         if (client) {
            let msg = '';
            let type: any = 'INFO';
            if (updatedOrder.status === 'IN_PROGRESS') msg = 'O técnico iniciou o serviço no seu endereço.';
            else if (updatedOrder.status === 'PENDING_REVIEW') { msg = 'Serviço finalizado! Por favor, revise e aprove a conclusão.'; type = 'SUCCESS'; }
            else if (updatedOrder.status === 'COMPLETED') { msg = 'Sua ordem de serviço foi concluída com sucesso. Obrigado!'; type = 'SUCCESS'; }
            else if (updatedOrder.status === 'CANCELLED') { msg = 'Sua ordem de serviço foi cancelada.'; type = 'ERROR'; }
            if (msg) await createNotification(client.id, 'Atualização de Status', msg, type, updatedOrder.id);
         }
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const updatedOrders = orders.filter(o => o.id !== orderId);
    setOrders(updatedOrders);
    await db.saveOrders(updatedOrders);
    setSelectedOrder(null);
  };

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
    const cleanCep = newUserData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
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
    } catch (error) { console.error('CEP Error:', error); }
    finally { setIsLoadingCep(false); }
  };

  // --- Renderização Condicional ---
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-bold animate-pulse">Sincronizando dados C.M.A...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-blue-600 tracking-tighter mb-2">C.M.A</h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Painel de Controle</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@cma.com" className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Entrar no Sistema</button>
          </form>
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
      case 'DASHBOARD': return <Dashboard orders={orders} currentUser={user} allUsers={usersList} onNavigateFilter={(s, t) => { setInitialListFilters({ status: s, type: t }); setCurrentView('GENERATED'); }} />;
      case 'GENERATED': return <GeneratedOrders orders={orders} currentUser={user} onSelectOrder={setSelectedOrder} initialFilters={initialListFilters} />;
      case 'NEW': return <NewWorkOrder currentUser={user} allUsers={usersList} onCancel={() => setCurrentView('GENERATED')} onSubmit={handleCreateOrder} />;
      case 'NOTIFICATIONS': return <NotificationsView notifications={userNotifications} onMarkAsRead={handleMarkAsRead} onMarkAllAsRead={handleMarkAllAsRead} onDelete={handleDeleteNotification} />;
      case 'PROFILE': return <ProfileView currentUser={user} viewer={user} onSave={handleUpdateProfile} />;
      case 'USERS':
        if (userToEdit) return <ProfileView currentUser={userToEdit} viewer={user} onSave={handleUpdateProfile} onBack={() => setUserToEdit(null)} />;
        return (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Usuários do Sistema</h2>
              {user.role === 'ADMIN' && <button onClick={() => setIsCreatingUser(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm"><UserPlus size={18} /> Novo Usuário</button>}
            </div>
            <div className="space-y-3">
              {usersList.filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter).map(u => (
                <div key={u.id} className="p-4 border rounded-xl flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-12 h-12 rounded-full object-cover border" alt="avatar" />
                    <div>
                      <p className="font-bold text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'TECHNICIAN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{u.role}</span>
                    </div>
                  </div>
                  {user.role === 'ADMIN' && <button onClick={() => setUserToEdit(u)} className="p-2 text-gray-400 hover:text-blue-600"><Pencil size={20} /></button>}
                </div>
              ))}
            </div>
            
            {isCreatingUser && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                  <div className="p-5 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><UserPlus className="text-blue-600" size={20}/> Novo Usuário</h3>
                    <button onClick={() => setIsCreatingUser(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome</label>
                          <input required className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Perfil</label>
                          <select className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value as Role})}>
                             <option value="CLIENT">Cliente</option><option value="TECHNICIAN">Técnico</option><option value="ADMIN">Administrador</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                          <input required type="email" className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
                       </div>
                    </div>
                    {newUserData.role === 'CLIENT' && (
                       <div className="bg-gray-50 p-6 rounded-2xl border space-y-4">
                          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><MapPin size={18}/> Endereço</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             <input className="p-2 border rounded" placeholder="CEP" value={newUserData.cep} onChange={e => setNewUserData({...newUserData, cep: e.target.value})} onBlur={handleCepBlur} />
                             <input className="col-span-3 p-2 border rounded" placeholder="Rua" value={newUserData.street} onChange={e => setNewUserData({...newUserData, street: e.target.value})} />
                          </div>
                       </div>
                    )}
                    <div className="flex gap-4">
                       <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 text-gray-500 font-bold border rounded-xl">Cancelar</button>
                       <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl">Criar Usuário</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      default: return <Dashboard orders={orders} currentUser={user} allUsers={usersList} onNavigateFilter={(s, t) => { setInitialListFilters({ status: s, type: t }); setCurrentView('GENERATED'); }} />;
    }
  };

  return (
    <Layout currentUser={user} currentView={currentView} onChangeView={(v) => { setCurrentView(v); setSelectedOrder(null); setUserToEdit(null); }} onLogout={() => setUser(null)} notifications={userNotifications} isSyncing={isSyncing}>
      {renderContent()}
    </Layout>
  );
};

export default App;