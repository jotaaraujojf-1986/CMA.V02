import React, { useState, useEffect, useRef } from 'react';
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
import { ProductivityDashboard } from './components/ProductivityDashboard';
import { AssistanceReportsDashboard } from './components/AssistanceReportsDashboard';
import { CompanyRegistration } from './components/CompanyRegistration';
import { WelcomeDashboard } from './components/WelcomeDashboard';
import { UpgradePlan } from './components/UpgradePlan';
import { LoginPage } from './components/LoginPage';
import { SuperadminDashboard } from './components/SuperadminDashboard';
import { FeatureGuard } from './components/FeatureGuard';
import { PageHeader } from './components/ui/PageHeader';
import { getPlanLimits, hasReachedLimit } from './utils/plans';
import { Button } from './components/ui/Button';
import { FilterBar } from './components/ui/FilterBar';
import { AlertToastContainer, AlertNav, playAlertSound, playReminderSound } from './components/AlertToast';
import { Lock, Pencil, Plus, X, Search, Loader2, Filter, User as UserIcon, Mail, Shield, Phone, MapPin, UserPlus, Database, Trash2 } from 'lucide-react';

export const LogoSF = ({ className = "" }: { className?: string }) => (
  <img src="/logo.png" alt="SF ServiceFlow Logo" className={`object-contain ${className}`} />
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<any | null>(null);
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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Tracks which tab to open when navigating from a toast
  const [selectedOrderInitialTab, setSelectedOrderInitialTab] = useState<'DETAILS' | 'CHAT' | 'ENVIRONMENTS'>('DETAILS');
  // Track previous notification count to detect new ones after login
  const prevNotifCountRef = useRef(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isRegisteringCompany, setIsRegisteringCompany] = useState(false);

  // --- Inicialização Assíncrona via Supabase ---
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      await db.initialize();
      const authUser = await db.getSessionUser();
      
      if (!authUser) {
        // Sem sessão — vai direto para login, sem buscar dados
        setIsLoading(false);
        return;
      }

      setUser(authUser);

      // Carrega empresa + dados principais em paralelo
      const [company, users, orders, notifs] = await Promise.all([
        db.getCompanyByUser(authUser),
        db.getUsers(),
        db.getOrders(),
        db.getNotifications()
      ]);

      // Verifica trial expirado (frontend guard)
      if (company && company.plano === 'trial' && company.plano_expira_em) {
        const expiration = new Date(company.plano_expira_em);
        if (expiration < new Date()) {
          company.plano = 'starter';
        }
      }

      setCurrentCompany(company);
      setUsersList(users);
      setOrders(orders);
      setNotifications(notifs);
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Play reminder sound when user logs in and has unread alert-type notifications
  useEffect(() => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read && !!n.alertType && n.userId === user.id);
    if (unread.length > 0 && prevNotifCountRef.current === 0) {
      playReminderSound();
    }
    prevNotifCountRef.current = unread.length;
  }, [user, notifications]);

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

  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO',
    orderId?: string,
    alertType?: 'NEW_ORDER' | 'ORDER_UPDATE' | 'CHAT_MESSAGE',
    navigateTo?: 'DETAILS' | 'CHAT'
  ) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      relatedOrderId: orderId,
      alertType,
      navigateTo,
    };
    // Optimistic local state update
    setNotifications(prev => [newNotif, ...prev]);
    // Persist to Supabase (with graceful fallback if migration not applied yet)
    await db.insertNotification(newNotif);
    return newNotif;
  };

  // Creates a notification for the CURRENT user (toast popup + sound)
  const fireAlert = async (
    alertType: 'NEW_ORDER' | 'ORDER_UPDATE' | 'CHAT_MESSAGE',
    title: string,
    message: string,
    orderId?: string,
    navigateTo?: 'DETAILS' | 'CHAT'
  ) => {
    if (!user) return;
    await createNotification(user.id, title, message, 'INFO', orderId, alertType, navigateTo);
    playAlertSound(alertType);
  };

  // --- Handlers de Notificação ---
  const handleMarkAsRead = async (id: string) => {
    // Optimistic local update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Persist to Supabase (single UPDATE)
    await db.markNotificationRead(id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    // Optimistic local update
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
    // Persist to Supabase
    await db.markAllNotificationsRead(user.id);
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      setIsSyncing(true);
      await db.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      alert('Erro ao excluir notificação. Por favor, tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSelectedNotifications = async (ids: string[]) => {
    if (ids.length === 0) return;
    // Optimistic local update
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    // Bulk DELETE in one query
    await db.deleteNotifications(ids);
  };

  const [newUserData, setNewUserData] = useState({
    name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT' as Role,
    classification: 'JUNIOR' as 'JUNIOR' | 'PLENO' | 'SENIOR',
    cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { user: authUser, error } = await db.login(email, password);
    setIsLoading(false);
    
    if (error || !authUser) {
      alert(`Falha no login: ${error?.message || 'Usuário ou senha incorretos na nuvem.'}`);
    } else {
      setUser(authUser);
      const company = await db.getCurrentCompany();
      setCurrentCompany(company);
      setUsersList(await db.getUsers());
      setOrders(await db.getOrders());
      setNotifications(await db.getNotifications());
      setCurrentView(authUser.role === 'CLIENT' ? 'GENERATED' : authUser.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'DASHBOARD');
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
    try {
      const oldUser = usersList.find(u => u.id === updatedUser.id);

      // Sincroniza credenciais em auth.users se email ou senha mudaram
      const emailChanged = oldUser && updatedUser.email !== oldUser.email;
      const passwordChanged = !!(updatedUser as any).password;
      if (emailChanged || passwordChanged) {
        await db.updateUserAuthCredentials(
          updatedUser.id,
          emailChanged ? updatedUser.email : undefined,
          passwordChanged ? (updatedUser as any).password : undefined,
        );
      }

      await db.updateUser(updatedUser);

      const newList = usersList.map(u => u.id === updatedUser.id ? updatedUser : u);
      setUsersList(newList);
      if (user && user.id === updatedUser.id) setUser(updatedUser);
      if (userToEdit) setUserToEdit(null);
      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      alert(`Erro ao atualizar perfil: ${error.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usersList.some(u => u.email === newUserData.email)) {
      alert('Este e-mail já está cadastrado.');
      return;
    }

    if (currentCompany && currentCompany.plano !== 'business') {
      const isTech = newUserData.role === 'TECHNICIAN';
      const isAdmin = newUserData.role === 'ADMIN';
      
      if (isTech) {
        const currCount = usersList.filter(u => u.role === 'TECHNICIAN').length;
        if (hasReachedLimit(currentCompany.plano, currCount, 'TECHNICIAN')) {
          alert('Você atingiu o limite de técnicos do seu plano. Faça upgrade para adicionar mais.');
          setCurrentView('UPGRADE_PLAN');
          setIsCreatingUser(false);
          return;
        }
      }

      if (isAdmin) {
        const currCount = usersList.filter(u => u.role === 'ADMIN').length;
        if (hasReachedLimit(currentCompany.plano, currCount, 'ADMIN')) {
          alert('Você atingiu o limite de administradores do seu plano. Faça upgrade para adicionar mais.');
          setCurrentView('UPGRADE_PLAN');
          setIsCreatingUser(false);
          return;
        }
      }
    }

    setIsSyncing(true);
    let auth_id_val = undefined;

    // Tentamos cadastrar no Auth (só funciona bem se for admin/assistente configurado ou signups abertos)
    const { userId: authUid, error: authErr } = await db.registerInAuth(newUserData.email, newUserData.password || '123');
    if (authErr) {
       console.error("Erro no Auth:", authErr);
       alert("Erro ao registrar autenticação. Os dados locais serão salvos mesmo assim como mock.");
    } else {
       auth_id_val = authUid;
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
      ...(auth_id_val ? { auth_id: auth_id_val } : {}),
      ...(isClient ? {
        address: formattedAddress,
        cep: newUserData.cep,
        street: newUserData.street,
        addressNumber: newUserData.addressNumber,
        complement: newUserData.complement,
        neighborhood: newUserData.neighborhood,
        city: newUserData.city,
        state: newUserData.state
      } : {}),
      ...(newUserData.role === 'TECHNICIAN' ? { classification: newUserData.classification } : {})
    };

    await saveUsers([...usersList, newUser]);
    
    // Log Audit para LGPD: "Novo usuario criado"
    if (user) {
        await db.logAudit(user.id, 'CRIAÇÃO DE USUÁRIO', undefined, { createdEmail: newUser.email, role: newUser.role });
    }

    setIsSyncing(false);
    setIsCreatingUser(false);
    setNewUserData({
      name: '', email: '', password: '', phone: '', secondaryPhone: '', role: 'CLIENT',
      classification: 'JUNIOR',
      cep: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: ''
    });
  };

  // --- Role-based alert filter ---
  // ADMIN/ASSISTANT: receive all alerts.
  // TECHNICIAN: only for orders they are assigned to (main or environment level).
  // CLIENT: only for their own orders (matched by email).
  const shouldReceiveAlert = (order: WorkOrder): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'ASSISTANT') return true;
    if (user.role === 'TECHNICIAN') {
      return (
        order.technicianId === user.id ||
        (order.environments?.some(e => e.technicianId === user.id) ?? false)
      );
    }
    if (user.role === 'CLIENT') {
      return order.clientEmail === user.email;
    }
    return false;
  };

  // --- Navigate from toast to O.S. ---
  const handleAlertNavigate = (orderId: string, tab: AlertNav) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderInitialTab(tab === 'CHAT' ? 'CHAT' : 'DETAILS');
      setSelectedOrder(order);
      setCurrentView('GENERATED'); // ensure layout shows the order
    }
  };

  const handleCreateOrder = async (newOrder: WorkOrder) => {
    await saveOrders([newOrder, ...orders]);

    // 🔔 Alert toast — role-filtered
    if (shouldReceiveAlert(newOrder)) {
      fireAlert(
        'NEW_ORDER',
        'Nova O.S. Criada!',
        `${newOrder.type === 'ASSEMBLY' ? 'Montagem' : 'Assistência'} criada para ${newOrder.clientName} (${newOrder.id})`,
        newOrder.id,
        'DETAILS'
      );
    }

    // Notificar Admin sobre nova O.S.
    const admins = usersList.filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      createNotification(admin.id, 'Nova O.S. Aberta', `Uma nova solicitação foi criada por ${newOrder.clientName}.`, 'INFO', newOrder.id);
    });

    // Se a O.S. já foi criada com um técnico atribuído, notifica-o imediatamente
    if (newOrder.technicianId) {
      createNotification(
        newOrder.technicianId, 
        'O.S. Atribuída a Você', 
        `Você foi atribuído à nova ${newOrder.type === 'ASSISTANCE' ? 'Assistência' : 'Montagem'} ${newOrder.id}.`, 
        'SUCCESS', 
        newOrder.id
      );

      // Notificar Cliente que um técnico foi atribuído
      const client = usersList.find(u => u.email === newOrder.clientEmail);
      if (client) {
        createNotification(client.id, 'Técnico Atribuído', `O técnico cuidará do seu pedido.`, 'INFO', newOrder.id);
      }
    }

    setCurrentView('GENERATED');
  };

  const handleUpdateOrder = async (updatedOrder: WorkOrder, alertType?: 'ORDER_UPDATE' | 'CHAT_MESSAGE', alertMsg?: string, alertTitle?: string) => {
    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    const newList = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    await saveOrders(newList);
    setSelectedOrder(updatedOrder);

    // 🔔 Alert toast — role-filtered
    if (shouldReceiveAlert(updatedOrder)) {
      if (alertType === 'CHAT_MESSAGE' && alertMsg) {
        fireAlert('CHAT_MESSAGE', alertTitle || 'Nova Mensagem no Chat', alertMsg, updatedOrder.id, 'CHAT');
      } else if (alertType === 'ORDER_UPDATE' && alertMsg) {
        fireAlert('ORDER_UPDATE', alertTitle || 'O.S. Atualizada', alertMsg, updatedOrder.id, 'DETAILS');
      } else if (!alertType && oldOrder && updatedOrder.status !== oldOrder.status) {
        fireAlert('ORDER_UPDATE', 'Status Alterado', `O.S. ${updatedOrder.id} → ${getStatusLabel(updatedOrder.status)}`, updatedOrder.id, 'DETAILS');
      }
    }

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
        if (user) {
          await db.logAudit(user.id, `STATUS ALTERADO: ${oldOrder.status} -> ${updatedOrder.status}`, updatedOrder.id);
        }
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
    // Confirmação antes de excluir
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmMessage = `Tem certeza que deseja excluir permanentemente a ordem ${orderId}?\n\nEsta ação não pode ser desfeita e irá remover:\n- A ordem de serviço\n- Todos os comentários\n- Todos os ambientes\n- Todos os itens de checklist\n\nDeseja continuar?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsSyncing(true);
      // Excluir do banco de dados (CASCADE DELETE automático)
      await db.deleteOrder(orderId);

      // Atualizar estado local
      const newList = orders.filter(o => o.id !== orderId);
      setOrders(newList);
      setSelectedOrder(null);

      // Notificar sucesso
      alert(`Ordem ${orderId} excluída com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      alert('Erro ao excluir ordem. Por favor, tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Validações de segurança
    if (user?.role !== 'ADMIN' && user?.role !== 'ASSISTANT') {
      alert('Apenas administradores e assistentes podem excluir usuários.');
      return;
    }

    if (user.id === userId) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }

    const userToDelete = usersList.find(u => u.id === userId);
    if (!userToDelete) return;

    // ASSISTENTE não pode excluir ADMIN
    if (user.role === 'ASSISTANT' && userToDelete.role === 'ADMIN') {
      alert('Assistentes não podem excluir administradores.');
      return;
    }

    // Confirmação com avisos claros
    const confirmMessage = `Tem certeza que deseja excluir permanentemente o usuário "${userToDelete.name}"?\n\nEsta ação não pode ser desfeita!\n\nIMPORTANTE:\n- O usuário será removido do sistema\n- Ordens de serviço relacionadas manterão os dados (nome, email)\n- Notificações do usuário serão removidas\n\nDeseja continuar?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsSyncing(true);

      // Excluir do banco de dados
      await db.deleteUser(userId);

      // Remover notificações do usuário
      const updatedNotifications = notifications.filter(n => n.userId !== userId);
      await db.saveNotifications(updatedNotifications);
      setNotifications(updatedNotifications);

      // Atualizar estado local de usuários
      const newList = usersList.filter(u => u.id !== userId);
      setUsersList(newList);

      // Notificar sucesso
      alert(`Usuário "${userToDelete.name}" excluído com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário. Por favor, tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDashboardNavigation = (status: string, type: WorkOrderType) => {
    setInitialListFilters({ status, type });
    setCurrentView('GENERATED');
  };

  if (isLoading) {
    return null;
  }

  if (!user) {
    if (isRegisteringCompany) {
      return (
        <CompanyRegistration 
          onCancel={() => setIsRegisteringCompany(false)}
          onSuccess={async (newUser) => {
            setUser(newUser);
            const company = await db.getCurrentCompany();
            setCurrentCompany(company);
            setIsRegisteringCompany(false);
            setCurrentView('WELCOME');
          }} 
        />
      );
    }

    return (
      <LoginPage
        email={email}
        password={password}
        isLoading={isLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        onRegister={() => setIsRegisteringCompany(true)}
      />
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
          initialTab={selectedOrderInitialTab}
        />
      );
    }

    switch (currentView) {
      case 'SUPERADMIN':
        return <SuperadminDashboard currentUser={user} />;
      case 'UPGRADE_PLAN':
        return <UpgradePlan currentPlan={currentCompany?.plano || 'starter'} onBack={() => setCurrentView('DASHBOARD')} />;
      case 'WELCOME':
        return <WelcomeDashboard onNavigate={(view) => setCurrentView(view)} />;
      case 'DASHBOARD':
        return <Dashboard orders={orders} currentUser={user} allUsers={usersList} onNavigateFilter={handleDashboardNavigation} currentCompany={currentCompany} onUpgradeRequest={() => setCurrentView('UPGRADE_PLAN')} />;
      case 'PRODUCTIVITY':
        return (
          <FeatureGuard currentPlan={currentCompany?.plano || 'starter'} feature="performanceRanking" featureName="Ranking de Performance" onUpgradeRequest={() => setCurrentView('UPGRADE_PLAN')}>
            <ProductivityDashboard orders={orders} currentUser={user} allUsers={usersList} onSelectOrder={setSelectedOrder} />
          </FeatureGuard>
        );
      case 'ASSISTANCE_REPORTS':
        return (
          <FeatureGuard currentPlan={currentCompany?.plano || 'starter'} feature="customPeriodReports" featureName="Relatórios Financeiros" onUpgradeRequest={() => setCurrentView('UPGRADE_PLAN')}>
            <AssistanceReportsDashboard orders={orders} currentUser={user} allUsers={usersList} onSelectOrder={setSelectedOrder} />
          </FeatureGuard>
        );
      case 'GENERATED':
        return <GeneratedOrders orders={orders} currentUser={user} onSelectOrder={setSelectedOrder} initialFilters={initialListFilters} />;
      case 'NEW': return <NewWorkOrder currentUser={user} allUsers={usersList} orders={orders} onCancel={() => setCurrentView('GENERATED')} onSubmit={handleCreateOrder} />;
      case 'NOTIFICATIONS':
        return <NotificationsView
          notifications={userNotifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDeleteNotification}
          onDeleteSelected={handleDeleteSelectedNotifications}
          onSelectOrder={(orderId) => {
            const order = orders.find(o => o.id === orderId);
            if (order) {
              setSelectedOrder(order);
            } else {
              alert('Esta ordem de serviço não foi encontrada ou foi excluída.');
            }
          }}
        />;
      case 'PROFILE': return <ProfileView currentUser={user} viewer={user} onSave={handleUpdateProfile} />;
      case 'USERS':
        if (userToEdit) {
          return <ProfileView currentUser={userToEdit} viewer={user} onSave={handleUpdateProfile} onBack={() => setUserToEdit(null)} />;
        }

        // Filtrar usuários por role e nome, depois ordenar alfabeticamente
        const filteredUsers = usersList
          .filter(u => userRoleFilter === 'ALL' || u.role === userRoleFilter)
          .filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name));
        const roleBadge = (role: string) => {
          const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
            ADMIN:      { bg: 'rgba(139,92,246,.15)', color: '#a78bfa', border: 'rgba(139,92,246,.3)', label: 'Administrador' },
            TECHNICIAN: { bg: 'rgba(26,107,255,.15)',  color: '#60a5fa', border: 'rgba(26,107,255,.3)', label: 'Técnico' },
            ASSISTANT:  { bg: 'rgba(251,146,60,.15)', color: '#fb923c', border: 'rgba(251,146,60,.3)', label: 'Assistente' },
            CLIENT:     { bg: 'rgba(16,185,129,.15)', color: '#34d399', border: 'rgba(16,185,129,.3)', label: 'Cliente' },
          };
          const s = map[role] ?? { bg: 'rgba(136,146,164,.15)', color: '#8892a4', border: 'rgba(136,146,164,.3)', label: role };
          return (
            <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {s.label}
            </span>
          );
        };

        const fieldLabel = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 4, display: 'block' };

        return (
          <div className="space-y-6">
            <PageHeader
              title="Gestão de Usuários"
              description="Gerencie acessos e perfis na plataforma."
              icon={<UserIcon size={22} style={{ color: 'var(--cyan)' }} />}
              actionPrimary={
                (user.role === 'ADMIN' || user.role === 'ASSISTANT') && (
                  <Button onClick={() => setIsCreatingUser(true)} icon={<UserPlus size={18} />}>
                    Novo Usuário
                  </Button>
                )
              }
            />

            <FilterBar>
              {/* Role filter */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <Shield size={13} /> Filtro por Perfil
                </label>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 4, height: 44, border: '1px solid rgba(255,255,255,.08)' }}>
                  {(['ALL', 'ADMIN', 'TECHNICIAN', 'ASSISTANT', 'CLIENT'] as const).map(role => (
                    <button key={role} onClick={() => setUserRoleFilter(role)}
                      style={{
                        flex: 1, borderRadius: 8, fontSize: 12, fontWeight: 600, transition: 'all .15s', border: 'none', cursor: 'pointer',
                        ...(userRoleFilter === role
                          ? { background: 'rgba(255,255,255,.1)', color: 'var(--sf-white)' }
                          : { background: 'transparent', color: 'var(--muted)' })
                      }}>
                      {role === 'ALL' ? 'Todos' : role === 'ADMIN' ? 'Admins' : role === 'TECHNICIAN' ? 'Técnicos' : role === 'ASSISTANT' ? 'Assistentes' : 'Clientes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div style={{ flex: 1, minWidth: 280 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <Search size={13} /> Busca
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Pesquisar usuário por nome..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    style={{ width: '100%', height: 44, padding: '0 40px 0 38px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: 'var(--sf-white)', fontSize: 14, outline: 'none' }}
                  />
                  {userSearchQuery && (
                    <button onClick={() => setUserSearchQuery('')}
                      style={{ position: 'absolute', right: 10, top: 12, background: 'none', border: 'none', color: 'var(--hint)', cursor: 'pointer', padding: 2 }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </FilterBar>

            {/* User List */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'var(--muted)' }}>Nenhum usuário encontrado.</div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.id}
                    style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1a6bff&color=fff`}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        style={{ border: '2px solid rgba(255,255,255,.1)' }}
                        alt="avatar"
                      />
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--sf-white)', marginBottom: 2 }}>{u.name}</p>
                        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 5 }}>{u.email}</p>
                        {roleBadge(u.role)}
                      </div>
                    </div>
                    {(user.role === 'ADMIN' || user.role === 'ASSISTANT') && (
                      <div className="flex items-center gap-1">
                        {!(user.role === 'ASSISTANT' && u.role === 'ADMIN') && (
                          <button onClick={() => setUserToEdit(u)}
                            style={{ padding: 8, color: 'var(--hint)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--hint)')}
                            title="Editar usuário">
                            <Pencil size={18} />
                          </button>
                        )}
                        {user.id !== u.id && !(user.role === 'ASSISTANT' && u.role === 'ADMIN') && (
                          <button onClick={() => handleDeleteUser(u.id)}
                            style={{ padding: 8, color: 'var(--hint)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--sf-red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--hint)')}
                            title="Excluir usuário">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Create User Modal */}
            {isCreatingUser && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                <div className="animate-fade-in" style={{ background: 'var(--navy3)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, width: '100%', maxWidth: 768, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>

                  {/* Modal Header */}
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--navy2)', borderRadius: '20px 20px 0 0', zIndex: 10 }}>
                    <h3 style={{ fontWeight: 700, color: 'var(--sf-white)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <UserPlus size={20} style={{ color: 'var(--cyan)' }} /> Cadastro de Novo Usuário
                    </h3>
                    <button onClick={() => setIsCreatingUser(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
                      <X size={22} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="grid md:grid-cols-2 gap-4">

                      <div className="space-y-1">
                        <label style={fieldLabel}>Nome Completo</label>
                        <div style={{ position: 'relative' }}>
                          <UserIcon size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)' }} />
                          <input required className="input-field pl-9" value={newUserData.name} onChange={e => setNewUserData({ ...newUserData, name: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label style={fieldLabel}>Perfil de Acesso</label>
                        <div style={{ position: 'relative' }}>
                          <Shield size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)', zIndex: 1 }} />
                          <select className="input-field pl-9" value={newUserData.role} onChange={e => setNewUserData({ ...newUserData, role: e.target.value as Role })}>
                            <option value="CLIENT">Cliente</option>
                            <option value="TECHNICIAN">Técnico</option>
                            <option value="ASSISTANT">Assistente</option>
                            {user.role === 'ADMIN' && <option value="ADMIN">Administrador</option>}
                          </select>
                        </div>
                      </div>

                      {newUserData.role === 'TECHNICIAN' && (
                        <div className="space-y-1">
                          <label style={fieldLabel}>Classificação (Metas)</label>
                          <div style={{ position: 'relative' }}>
                            <Shield size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)', zIndex: 1 }} />
                            <select className="input-field pl-9" value={newUserData.classification} onChange={e => setNewUserData({ ...newUserData, classification: e.target.value as any })}>
                              <option value="JUNIOR">Júnior</option>
                              <option value="PLENO">Pleno</option>
                              <option value="SENIOR">Sênior</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label style={fieldLabel}>E-mail (Login)</label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)' }} />
                          <input required type="email" className="input-field pl-9" value={newUserData.email} onChange={e => setNewUserData({ ...newUserData, email: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label style={fieldLabel}>Senha Inicial</label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)' }} />
                          <input required type="text" className="input-field pl-9" placeholder="Defina a senha" value={newUserData.password} onChange={e => setNewUserData({ ...newUserData, password: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label style={fieldLabel}>Telefone Principal</label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)' }} />
                          <input required className="input-field pl-9" placeholder="11988888888" value={newUserData.phone} onChange={e => setNewUserData({ ...newUserData, phone: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label style={fieldLabel}>Telefone Secundário</label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--hint)' }} />
                          <input className="input-field pl-9" placeholder="1133334444" value={newUserData.secondaryPhone} onChange={e => setNewUserData({ ...newUserData, secondaryPhone: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    {/* Address section for CLIENT */}
                    {newUserData.role === 'CLIENT' && (
                      <div className="animate-fade-in" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20 }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--sf-white)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                          <MapPin size={16} style={{ color: 'var(--blue)' }} /> Endereço de Atendimento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="col-span-1">
                            <label style={fieldLabel}>CEP</label>
                            <div style={{ position: 'relative' }}>
                              <input required className="input-field" placeholder="01000-000" value={newUserData.cep} onChange={e => setNewUserData({ ...newUserData, cep: e.target.value })} onBlur={handleCepBlur} />
                              <div style={{ position: 'absolute', right: 12, top: 13, color: 'var(--hint)' }}>
                                {isLoadingCep ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--cyan)' }} /> : <Search size={15} />}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label style={fieldLabel}>Rua / Avenida</label>
                            <input required className="input-field" placeholder="Rua das Flores" value={newUserData.street} onChange={e => setNewUserData({ ...newUserData, street: e.target.value })} />
                          </div>
                          <div className="col-span-1">
                            <label style={fieldLabel}>Número</label>
                            <input required className="input-field" placeholder="123" value={newUserData.addressNumber} onChange={e => setNewUserData({ ...newUserData, addressNumber: e.target.value })} />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label style={fieldLabel}>Complemento / Apto</label>
                            <input className="input-field" value={newUserData.complement} onChange={e => setNewUserData({ ...newUserData, complement: e.target.value })} />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label style={fieldLabel}>Bairro</label>
                            <input required className="input-field" placeholder="Centro" value={newUserData.neighborhood} onChange={e => setNewUserData({ ...newUserData, neighborhood: e.target.value })} />
                          </div>
                          <div className="col-span-1">
                            <label style={fieldLabel}>Cidade</label>
                            <input required className="input-field" placeholder="São Paulo" value={newUserData.city} onChange={e => setNewUserData({ ...newUserData, city: e.target.value })} />
                          </div>
                          <div className="col-span-1">
                            <label style={fieldLabel}>Estado (UF)</label>
                            <input required maxLength={2} className="input-field uppercase" placeholder="SP" value={newUserData.state} onChange={e => setNewUserData({ ...newUserData, state: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col md:flex-row gap-3">
                      <Button variant="secondary" onClick={() => setIsCreatingUser(false)} className="flex-1 py-4 text-[15px]">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSyncing} className="flex-[2] py-4 text-[15px]"
                        icon={isSyncing ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}>
                        Cadastrar Novo Usuário
                      </Button>
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
    <>
      <Layout
        currentUser={user} currentView={currentView}
        onChangeView={(view) => { setCurrentView(view); setSelectedOrder(null); setUserToEdit(null); }}
        onLogout={async () => {
          await db.logout();
          setUser(null);
          setCurrentCompany(null);
          setUsersList([]);
          setOrders([]);
          setNotifications([]);
        }} notifications={userNotifications}
        isSyncing={isSyncing}
      >
        {renderContent()}
      </Layout>
      <AlertToastContainer
        notifications={userNotifications}
        onDismiss={handleMarkAsRead}
        onNavigate={handleAlertNavigate}
      />
    </>
  );
};

export default App;