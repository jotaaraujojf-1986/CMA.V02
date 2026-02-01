import { createClient } from '@supabase/supabase-js';
import { User, WorkOrder, Notification } from '../types';
import { MOCK_USERS, INITIAL_ORDERS, INITIAL_NOTIFICATIONS } from './mockData';

const SUPABASE_URL = 'https://kmwfgnnwafapinnklfth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nEjm0Ru-qN9isDizYc9pyg_crlNboP8';

// Inicialização do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseDatabaseService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
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
    }
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) return MOCK_USERS;
    return data as User[];
  }

  async saveUsers(users: User[]): Promise<void> {
    await supabase.from('users').upsert(users);
  }

  // --- Orders ---
  async getOrders(): Promise<WorkOrder[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) return INITIAL_ORDERS;
    return data as WorkOrder[];
  }

  async saveOrders(orders: WorkOrder[]): Promise<void> {
    await supabase.from('orders').upsert(orders);
  }

  async updateSingleOrder(order: WorkOrder): Promise<void> {
    await supabase.from('orders').upsert(order);
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) return [];
    return data as Notification[];
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    await supabase.from('notifications').upsert(notifications);
  }

  async addNotification(notification: Notification): Promise<void> {
    await supabase.from('notifications').insert(notification);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('userId', userId);
  }
}

export const db = new SupabaseDatabaseService();