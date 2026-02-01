import { createClient } from '@supabase/supabase-js';
import { User, WorkOrder, Notification } from '../types';
import { MOCK_USERS, INITIAL_ORDERS, INITIAL_NOTIFICATIONS } from './mockData';

const SUPABASE_URL = 'https://kmwfgnnwafapinnklfth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nEjm0Ru-qN9isDizYc9pyg_crlNboP8';

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
    
    try {
      // Verifica se há usuários, se não houver (primeiro acesso), semeia com mocks
      const { data: users } = await supabase.from('users').select('id').limit(1);
      if (!users || users.length === 0) {
        console.info('[C.M.A Supabase] Semeando banco de dados inicial...');
        await supabase.from('users').upsert(MOCK_USERS);
        await supabase.from('orders').upsert(INITIAL_ORDERS);
        await supabase.from('notifications').upsert(INITIAL_NOTIFICATIONS);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[C.M.A Supabase] Erro na inicialização:', error);
      // Fallback silencioso para garantir que o app não quebre
    }
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return MOCK_USERS;
    }
    return data as User[];
  }

  async saveUsers(users: User[]): Promise<void> {
    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error('Erro ao salvar usuários:', error);
  }

  // --- Orders ---
  async getOrders(): Promise<WorkOrder[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar ordens:', error);
      return INITIAL_ORDERS;
    }
    return data as WorkOrder[];
  }

  async saveOrders(orders: WorkOrder[]): Promise<void> {
    // Para simplificar a integração com o estado atual do App, fazemos upsert do array
    const { error } = await supabase.from('orders').upsert(orders);
    if (error) console.error('Erro ao salvar ordens:', error);
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
    return data as Notification[];
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    const { error } = await supabase.from('notifications').upsert(notifications);
    if (error) console.error('Erro ao salvar notificações:', error);
  }
}

export const db = new SupabaseDatabaseService();