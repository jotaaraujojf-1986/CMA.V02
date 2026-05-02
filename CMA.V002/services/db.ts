import { createClient } from '@supabase/supabase-js';
import { User, WorkOrder, Notification, Comment, Environment, ChecklistItem, TechnicianTargets } from '../types';
import { MOCK_USERS, INITIAL_ORDERS, INITIAL_NOTIFICATIONS } from './mockData';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qhxsrxewfhumlmrwpjdr.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeHNyeGV3Zmh1bWxtcndwamRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc1MDEsImV4cCI6MjA4NTU2MzUwMX0.0wgZi9d3BcTlf7oCLdiLKRJAEt8XmML8m6JWCviH9R8';

// Inicialização do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseDatabaseService {
  private isInitialized = false;

  /**
   * Inicializa o banco garantindo que os dados básicos existam.
   * Em produção, isso seria gerenciado por migrations.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    // Em um ambiente Multi-Tenant real, a inicialização não deve semear dados globais.
    // O setup da empresa é feito via RPC setup_nova_empresa.
    this.isInitialized = true;
  }

  // --- Auth & Identity ---
  async login(email: string, password: string): Promise<{ user: User | null, error: any }> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      return { user: null, error: authError || new Error("Credenciais inválidas no Supabase Auth.") };
    }
    
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();
      
    if (dbError || !dbUser) {
      const { data: unlinkedUser } = await supabase.from('users').select('*').eq('email', email).single();
      if (unlinkedUser) {
        await supabase.from('users').update({ auth_id: authData.user.id }).eq('id', unlinkedUser.id);
        return { user: { ...unlinkedUser, auth_id: authData.user.id } as User, error: null };
      }
      return { user: null, error: new Error("Usuário público não encontrado.") };
    }
    
    return { user: dbUser as User, error: null };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getSessionUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    
    const { data, error } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single();
    if (!error && data) return data as User;
    return null;
  }

  async registerInAuth(email: string, password: string):Promise<{userId: string | null, error: any}> {
    // Usa RPC com SECURITY DEFINER para criar o usuário diretamente em auth.users,
    // contornando restrições do endpoint signUp (ex: "email logins disabled").
    const { data, error } = await supabase.rpc('create_auth_user', {
      p_email: email,
      p_password: password,
    });

    if (error) return { userId: null, error };
    return { userId: data as string, error: null };
  }

  /**
   * Obtém a empresa atual do usuário logado
   */
  async getCurrentCompany(): Promise<any | null> {
    const user = await this.getSessionUser();
    // O banco retorna snake_case (empresa_id), mas o tipo usa camelCase (empresaId)
    const empresaId = (user as any)?.empresa_id || user?.empresaId;
    if (!user || !empresaId) return null;

    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (error || !data) return null;
    return data;
  }

  /**
   * Versão otimizada que recebe o usuário já carregado,
   * evitando uma chamada duplicada a getSessionUser().
   */
  async getCompanyByUser(user: User): Promise<any | null> {
    const empresaId = (user as any)?.empresa_id || user?.empresaId;
    if (!empresaId) return null;

    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (error || !data) return null;
    return data;
  }

  /**
   * Registra uma nova empresa (Multi-Tenant)
   * 1. Cria usuário no Auth
   * 2. Chama a RPC setup_nova_empresa para criar a empresa e vincular o Admin
   */
  async registerCompany(
    companyName: string,
    adminName: string,
    email: string,
    password: string,
    city: string,
    teamSize: number,
    plan: string = 'pro',
    billingCycle: string = 'monthly'
  ): Promise<{empresaId: string | null, error: any}> {
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    
    if (authError || !data.user) {
      return { empresaId: null, error: authError || new Error("Falha ao criar usuário no Auth") };
    }

    const { data: empresaId, error: rpcError } = await supabase.rpc('setup_nova_empresa', {
      p_auth_id: data.user.id,
      p_user_email: email,
      p_user_name: adminName,
      p_empresa_nome: companyName,
      p_cidade: city,
      p_numero_tecnicos: teamSize,
      p_plano: plan,
      p_billing_cycle: billingCycle
    });

    if (rpcError) {
      console.error("Erro na RPC setup_nova_empresa:", rpcError);
      return { empresaId: null, error: rpcError };
    }

    return { empresaId, error: null };
  }

  async updateCurrentCompanyPlan(plan: string, billingCycle: string): Promise<void> {
    const company = await this.getCurrentCompany();
    if (!company) return;
    await supabase
      .from('empresas')
      .update({ plano: plan, billing_cycle: billingCycle })
      .eq('id', company.id);
  }


  // --- Users ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
    return data as User[];
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) throw new Error("Empresa não identificada para salvar usuários.");

      const usersToSave = users.map(u => ({
        ...u,
        empresa_id: (u as any).empresa_id || u.empresaId || company.id
      }));

      const { error } = await supabase.from('users').upsert(usersToSave);
      
      if (error) {
        if (error.message?.includes('classification') || error.message?.includes('Could not find the')) {
           console.warn('[CMA Supabase] Fallback users save (missing classification column)');
           const fallbackUsers = usersToSave.map(u => {
              const { classification, ...safeU } = u as any;
              return safeU;
           });
           const { error: fallbackError } = await supabase.from('users').upsert(fallbackUsers);
           if (fallbackError) throw fallbackError;
           console.log('✅ Usuários salvos com sucesso (fallback)');
           return;
        }
        throw error;
      }
      console.log('✅ Usuários salvos com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao salvar usuários:', error);
      alert(`Erro ao salvar usuário: ${error.message}`);
    }
  }

  /**
   * Deleta um usuário permanentemente do banco de dados.
   * As referências em ordens de serviço (nomes, emails) serão mantidas,
   * mas o ID do usuário não existirá mais no sistema.
   */
  async updateUserAuthCredentials(userId: string, newEmail?: string, newPassword?: string): Promise<void> {
    const { error } = await supabase.rpc('update_user_auth_credentials', {
      p_user_id: userId,
      p_new_email: newEmail ?? null,
      p_new_password: newPassword ?? null,
    });
    if (error) throw error;
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_user_completely', { p_user_id: userId });

      if (error) throw error;
      console.log(`[C.M.A Supabase] Usuário ${userId} excluído com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  }

  async updateUser(user: User): Promise<void> {
    const company = await this.getCurrentCompany();

    // Monta apenas os campos que existem como colunas no banco (remove aliases TypeScript)
    const {
      empresaId,   // alias camelCase — coluna real é empresa_id
      auth_id,     // gerenciado pelo sistema de auth, não alterar
      ...rest
    } = { ...user } as any;

    const dataToUpdate = {
      ...rest,
      empresa_id: (user as any).empresa_id || empresaId || company?.id,
    };

    const { error, count } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('id', user.id)
      .select('id', { count: 'exact', head: true });

    if (error) {
      // Fallback: remove colunas adicionadas posteriormente que podem não existir
      const { classification, cep, street, addressNumber, complement, neighborhood, city, state, address, ...safeU } = dataToUpdate as any;
      const { error: fallbackError } = await supabase.from('users').update(safeU).eq('id', user.id);
      if (fallbackError) throw fallbackError;
      return;
    }

    if (count === 0) {
      throw new Error('Nenhuma linha atualizada. Verifique suas permissões de acesso.');
    }
  }

  // --- Settings ---
  async getTechnicianTargets(): Promise<TechnicianTargets> {
    const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'technician_targets').single();
    if (error || !data) {
      const local = localStorage.getItem('technician_targets');
      if (local) return JSON.parse(local);
      return { JUNIOR: 85000, PLENO: 100000, SENIOR: 120000 };
    }
    return data.value as TechnicianTargets;
  }

  async saveTechnicianTargets(targets: TechnicianTargets): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) throw new Error("Empresa não identificada.");

      const { error } = await supabase.from('system_settings').upsert({ 
        key: 'technician_targets', 
        value: targets,
        empresa_id: company.id 
      });
      
      if (error) {
         console.warn('[CMA Supabase] Fallback to localStorage for targets', error.message);
      }
      localStorage.setItem('technician_targets', JSON.stringify(targets));
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
    }
  }

  // --- Orders ---
  async getOrders(): Promise<WorkOrder[]> {
    try {
      // Busca as ordens
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) return [];

      const orderIds = ordersData.map(o => o.id);

      // Busca TODOS os relacionamentos em paralelo (4 queries no total ao invés de N*3)
      const [commentsRes, environmentsRes, checklistRes] = await Promise.all([
        supabase
          .from('comments')
          .select('*')
          .in('orderId', orderIds)
          .order('timestamp', { ascending: true }),
        supabase
          .from('environments')
          .select('*')
          .in('orderId', orderIds),
        supabase
          .from('checklist_items')
          .select('*')
          .in('orderId', orderIds)
      ]);

      const allComments = commentsRes.data || [];
      const allEnvironments = environmentsRes.data || [];
      const allChecklistItems = checklistRes.data || [];

      // Se há ambientes, busca os checklists dos ambientes (por environmentId)
      let envChecklistItems: any[] = [];
      if (allEnvironments.length > 0) {
        const envIds = allEnvironments.map(e => e.id);
        const { data } = await supabase
          .from('checklist_items')
          .select('*')
          .in('environmentId', envIds);
        envChecklistItems = data || [];
      }

      // Monta as ordens em memória
      const orders: WorkOrder[] = ordersData.map(order => {
        const comments = allComments
          .filter(c => c.orderId === order.id)
          .map(c => ({ ...c, timestamp: new Date(c.timestamp) }));

        const assistanceChecklist = allChecklistItems.filter(
          item => item.orderId === order.id && !item.environmentId
        );

        const environments: Environment[] = allEnvironments
          .filter(env => env.orderId === order.id)
          .map(env => ({
            ...env,
            checklist: envChecklistItems.filter(item => item.environmentId === env.id)
          }));

        return {
          ...order,
          comments,
          environments,
          assistanceChecklist: assistanceChecklist.length > 0 ? assistanceChecklist : undefined
        } as WorkOrder;
      });

      return orders;
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
      return [];
    }
  }

  async saveOrders(orders: WorkOrder[]): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) throw new Error("Empresa não identificada para salvar ordens.");

      for (const order of orders) {
        // Salva a ordem principal (sem campos relacionados)
        const { assistanceChecklist, environments, comments, ...orderData } = order;
        const fullOrderData = { 
          ...orderData, 
          empresa_id: (orderData as any).empresa_id || (orderData as any).empresaId || company.id 
        };

        const { error: orderError } = await supabase.from('orders').upsert(fullOrderData);
        
        if (orderError) {
          // Fallback if the user hasn't applied the SQL columns for post-assembly origins yet
          if (orderError.message.includes("isPostAssembly") || orderError.message.includes("is_post_assembly")) {
            const { 
              isPostAssembly, 
              relatedAssemblyWorkOrderId, 
              relatedAssemblyTechnicianId, 
              relatedAssemblyFinishedAt, 
              relatedEnvironmentId, 
              ...fallbackData 
            } = fullOrderData as any;
            
            const { error: fallbackError } = await supabase.from('orders').upsert(fallbackData);
            if (fallbackError) throw fallbackError;
          } else {
            throw orderError;
          }
        }

        // Sincronizar comentários
        if (comments && comments.length > 0) {
          const commentsWithOrderId = comments.map(c => ({
            ...c,
            orderId: order.id,
            timestamp: new Date(c.timestamp).toISOString(),
            empresa_id: (c as any).empresa_id || (c as any).empresaId || company.id
          }));
          await supabase.from('comments').upsert(commentsWithOrderId);
        }

        // Sincronizar checklist de assistência
        if (assistanceChecklist && assistanceChecklist.length > 0) {
          const checklistWithOrderId = assistanceChecklist.map(item => ({
            ...item,
            orderId: order.id,
            environmentId: null,
            empresa_id: (item as any).empresa_id || (item as any).empresaId || company.id
          }));
          await supabase.from('checklist_items').upsert(checklistWithOrderId);
        }

        // Sincronizar ambientes
        if (environments && environments.length > 0) {
          for (const env of environments) {
            const { checklist, ...envData } = env as any;
            
            await supabase.from('environments').upsert({
              ...envData,
              orderId: order.id,
              empresa_id: envData.empresa_id || envData.empresaId || company.id
            });

            if (checklist && checklist.length > 0) {
              const envChecklistItems = checklist.map(item => ({
                ...item,
                orderId: null,
                environmentId: env.id,
                empresa_id: (item as any).empresa_id || (item as any).empresaId || company.id
              }));
              await supabase.from('checklist_items').upsert(envChecklistItems);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao salvar ordens:', error);
    }
  }

  /**
   * Deleta uma ordem de serviço permanentemente do banco de dados.
   * Graças ao CASCADE DELETE, todos os dados relacionados serão automaticamente excluídos:
   * - Comentários
   * - Ambientes
   * - Itens de checklist
   */
  async deleteOrder(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      console.log(`[C.M.A Supabase] Ordem ${orderId} excluída com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      throw error;
    }
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
    return (data || []).map(n => ({
      ...n,
      timestamp: new Date(n.timestamp)
    }));
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) return;

      const notifsToSave = notifications.map(n => ({
        ...n,
        timestamp: (n.timestamp as any) instanceof Date ? (n.timestamp as any).toISOString() : n.timestamp,
        empresa_id: (n as any).empresa_id || (n as any).empresaId || company.id
      }));

      await supabase.from('notifications').upsert(notifsToSave);
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  }

  /**
   * Insere UMA notificação nova no banco.
   * Faz fallback sem os campos alertType/navigateTo se as colunas ainda não existirem.
   */
  async insertNotification(notif: Notification): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) return;

      const fullNotif = {
        ...notif,
        empresa_id: (notif as any).empresa_id || (notif as any).empresaId || company.id
      };

      const { error } = await supabase.from('notifications').insert(fullNotif);
      if (error) {
        if (error.message?.includes('alertType') || error.message?.includes('navigateTo')) {
          const { alertType, navigateTo, ...safeNotif } = fullNotif as any;
          const { error: fallbackError } = await supabase.from('notifications').insert(safeNotif);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Erro ao inserir notificação:', error);
    }
  }

  /**
   * Marca apenas uma notificação como lida (UPDATE cirúrgico, não upsert em massa).
   */
  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) console.error('Erro ao marcar notificação como lida:', error);
  }

  /**
   * Marca todas as notificações de um usuário como lidas.
   */
  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('userId', userId)
      .eq('read', false);
    if (error) console.error('Erro ao marcar todas as notificações como lidas:', error);
  }

  /**
   * Deleta uma notificação permanentemente do banco de dados.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      console.log(`[C.M.A Supabase] Notificação ${notificationId} excluída com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      throw error;
    }
  }

  /** Deleta todas as notificações lidas de um usuário de uma só vez. */
  async deleteReadNotifications(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('userId', userId)
      .eq('read', true);
    if (error) console.error('Erro ao excluir notificações lidas:', error);
  }

  /** Deleta uma lista específica de notificações por IDs. */
  async deleteNotifications(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids);
    if (error) console.error('Erro ao excluir notificações selecionadas:', error);
  }

  // --- Audit Logs (LGPD) ---
  async logAudit(userId: string, action: string, orderId?: string, details?: any): Promise<void> {
    try {
      const company = await this.getCurrentCompany();
      if (!company) return;

      await supabase.from('audit_logs').insert({
        userId,
        action,
        orderId,
        details,
        empresa_id: company.id
      });
    } catch (e) {
      console.error('Erro ao salvar audit log:', e);
    }
  }
  
  // --- Occurrences / Events ---
  async getWorkOrderEvents(workOrderId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('work_order_events')
        .select(`
          *,
          attachments:work_order_event_attachments(*)
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('[CMA Supabase] migration for work_order_events not yet applied via SQL.');
          return [];
        }
        console.error("Supabase Select events error:", error);
        throw error;
      }
      
      // Fetch resolving details manually to bypass FK limitations
      const authIds = Array.from(new Set(data?.map(d => d.created_by).filter(Boolean)));
      const envIds = Array.from(new Set(data?.map(d => d.environment_id).filter(Boolean)));
      
      let mappedUsers: any[] = [];
      if (authIds.length > 0) {
        const { data: u } = await supabase.from('users').select('auth_id, name').in('auth_id', authIds);
        if (u) mappedUsers = u;
      }
      
      let mappedEnvs: any[] = [];
      if (envIds.length > 0) {
        const { data: e } = await supabase.from('environments').select('id, name').in('id', envIds);
        if (e) mappedEnvs = e;
      }
      
      // format response
      return data?.map(d => ({
        id: d.id,
        workOrderId: d.work_order_id,
        workOrderType: d.work_order_type,
        scope: d.scope,
        environmentId: d.environment_id,
        category: d.category,
        title: d.title,
        description: d.description,
        impactDeadline: d.impact_deadline,
        impactWorkdays: d.impact_workdays,
        impactCost: d.impact_cost,
        impactCostBrl: d.impact_cost_brl,
        visibility: d.visibility,
        status: d.status,
        createdBy: d.created_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        createdByName: mappedUsers.find(u => u.auth_id === d.created_by)?.name || 'Desconhecido(a)',
        environmentName: mappedEnvs.find(e => e.id === d.environment_id)?.name,
        attachments: d.attachments?.map((att: any) => ({
           id: att.id,
           eventId: att.event_id,
           workOrderId: att.work_order_id,
           fileUrl: att.file_url,
           fileName: att.file_name,
           fileType: att.file_type,
           createdAt: att.created_at
        })) || []
      })) || [];
    } catch (e) {
      console.error('Erro ao buscar eventos da OS:', e);
      return [];
    }
  }

  async createWorkOrderEvent(eventParams: any, attachments?: File[]): Promise<any> {
    try {
      const user = await this.getSessionUser();
      const company = await this.getCurrentCompany();
      if (!company) throw new Error("Empresa não identificada.");
      
      // Snake case payload expected by Supabase
      const payload = {
        work_order_id: eventParams.workOrderId,
        work_order_type: eventParams.workOrderType,
        scope: eventParams.scope,
        environment_id: eventParams.environmentId || null,
        category: eventParams.category,
        title: eventParams.title,
        description: eventParams.description,
        impact_deadline: eventParams.impactDeadline,
        impact_workdays: eventParams.impactWorkdays || null,
        impact_cost: eventParams.impactCost,
        impact_cost_brl: eventParams.impactCostBrl || null,
        visibility: eventParams.visibility || 'internal',
        status: eventParams.status || 'open',
        created_by: user?.auth_id,
        empresa_id: company.id
      };

      const { data: newEvent, error } = await supabase
        .from('work_order_events')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      
      if (attachments && attachments.length > 0) {
          for (let file of attachments) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${newEvent.id}/${Math.random().toString(36).substring(7)}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);
                
              if (uploadError) {
                  console.error('Upload Error:', uploadError);
                  continue;
              }
              
              const { data: publicUrlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName); // Fallback depending on bucket config
              
              const { error: attachmentError } = await supabase.from('work_order_event_attachments').insert({
                 event_id: newEvent.id,
                 work_order_id: eventParams.workOrderId,
                 file_url: publicUrlData.publicUrl,
                 file_name: file.name,
                 file_type: file.type,
                 empresa_id: company.id
              });
              
              if (attachmentError) {
                  console.error('Erro ao salvar anexo da ocorrência:', attachmentError);
              }
          }
      }

      const envInfo = payload.environment_id ? ` para o ambiente` : '';
      await this.logAudit(user?.id || '', `Ocorrência registrada: ${payload.title}${envInfo}`, payload.work_order_id);

      // --- Notifications ---
      const orderRes = await supabase.from('orders').select('"technicianId"').eq('id', payload.work_order_id).single();
      const techId = orderRes.data?.technicianId;
      const { data: targetUsers } = await supabase.from('users').select('id, role').in('role', ['ADMIN', 'ASSISTANT']);
      const targetsToNotify = new Set((targetUsers || []).map(u => u.id));
      if (techId) targetsToNotify.add(techId);
      targetsToNotify.delete(user?.id);

      for (let tId of Array.from(targetsToNotify)) {
         if(!tId) continue;
         await this.insertNotification({
            id: Math.random().toString(36).substring(7),
            userId: tId as string,
            title: 'Nova Ocorrência',
            message: `A ocorrência '${payload.title}' foi registrada na ordem de serviço.`,
            type: 'WARNING',
            read: false,
            timestamp: new Date().toISOString(),
            relatedOrderId: payload.work_order_id,
            navigateTo: 'DETAILS'
         });
      }

      return newEvent;
    } catch (e) {
      console.error('Erro ao criar ocorrência:', e);
      throw e;
    }
  }

  async updateWorkOrderEvent(eventId: string, payload: any, attachments?: File[]): Promise<void> {
    try {
      const user = await this.getSessionUser();
      const company = await this.getCurrentCompany();
      if (!company) throw new Error("Empresa não identificada.");

      const { error } = await supabase
        .from('work_order_events')
        .update({
           category: payload.category,
           title: payload.title,
           description: payload.description,
           impact_deadline: payload.impactDeadline,
           impact_workdays: payload.impactDeadline ? payload.impactWorkdays : null,
           impact_cost: payload.impactCost,
           impact_cost_brl: payload.impactCost ? payload.impactCostBrl : null,
           visibility: payload.visibility,
           updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;
      
      if (attachments && attachments.length > 0) {
          for (let file of attachments) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${eventId}/${Math.random().toString(36).substring(7)}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);
                
              if (uploadError) {
                  console.error('Upload Error:', uploadError);
                  continue;
              }
              
              const { data: publicUrlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName);
              
              const { error: attachmentError } = await supabase.from('work_order_event_attachments').insert({
                 event_id: eventId,
                 work_order_id: payload.workOrderId,
                 file_url: publicUrlData.publicUrl,
                 file_name: file.name,
                 file_type: file.type,
                 empresa_id: company.id
              });
              
              if (attachmentError) {
                  console.error('Erro ao salvar anexo na edição da ocorrência:', attachmentError);
              }
          }
      }
      
      await this.logAudit(user?.id || '', `Ocorrência Editada: ${payload.title}`, payload.workOrderId);
      
      // Notify update
      const orderRes = await supabase.from('orders').select('"technicianId"').eq('id', payload.workOrderId).single();
      const techId = orderRes.data?.technicianId;
      const { data: targetUsers } = await supabase.from('users').select('id, role').in('role', ['ADMIN', 'ASSISTANT']);
      const targetsToNotify = new Set((targetUsers || []).map(u => u.id));
      if (techId) targetsToNotify.add(techId);
      targetsToNotify.delete(user?.id);

      for (let tId of Array.from(targetsToNotify)) {
         if(!tId) continue;
         await this.insertNotification({
            id: Math.random().toString(36).substring(7),
            userId: tId as string,
            title: 'Ocorrência Atualizada',
            message: `A ocorrência '${payload.title}' foi alterada.`,
            type: 'INFO',
            read: false,
            timestamp: new Date().toISOString(),
            relatedOrderId: payload.workOrderId,
            navigateTo: 'DETAILS'
         });
      }
    } catch(e) {
      console.error('Erro atualizar ocorrência:', e);
      throw e;
    }
  }

  async deleteWorkOrderEvent(eventId: string, workOrderId: string, title?: string): Promise<void> {
     try {
       const user = await this.getSessionUser();
       const { error } = await supabase.from('work_order_events').delete().eq('id', eventId);
       if (error) throw error;
       await this.logAudit(user?.id || '', `Ocorrência Excluída: ${title || eventId}`, workOrderId);
     } catch(e) {
       console.error('Erro ao excluir ocorrência', e);
       throw e;
     }
  }
  
  async updateWorkOrderEventStatus(eventId: string, status: 'open' | 'resolved'): Promise<void> {
    try {
        const { error } = await supabase.from('work_order_events').update({ status, updated_at: new Date().toISOString() }).eq('id', eventId);
        if (error) throw error;
    } catch(e) {
        console.error('Erro atualizar status occ.', e);
        throw e;
    }
  }
}

export const db = new SupabaseDatabaseService();
