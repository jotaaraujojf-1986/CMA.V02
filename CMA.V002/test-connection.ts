import { createClient } from '@supabase/supabase-js';
import { MOCK_USERS, INITIAL_ORDERS, INITIAL_NOTIFICATIONS } from './services/mockData';

const SUPABASE_URL = 'https://dumocbdvfgmhybyltzdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW9jYmR2ZmdtaHlieWx0emRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODQ3ODMsImV4cCI6MjA4NTU2MDc4M30.d8ZdY_NTC7PfLr_zygPlzSSygm_p5B3bMcGFsKJ-6BM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔄 Testando conexão com Supabase...');

async function testConnection() {
    try {
        console.log('📦 Inicializando banco de dados...');

        // Verifica se há usuários
        const { data: users } = await supabase.from('users').select('id').limit(1);

        if (!users || users.length === 0) {
            console.log('🌱 Semeando banco de dados inicial...');

            // Insere usuários
            await supabase.from('users').upsert(MOCK_USERS);
            console.log('✅ Usuários inseridos');

            // Insere notificações
            await supabase.from('notifications').upsert(INITIAL_NOTIFICATIONS);
            console.log('✅ Notificações inseridas');

            // Insere ordens e seus relacionamentos
            for (const order of INITIAL_ORDERS) {
                const { assistanceChecklist, environments, comments, ...orderData } = order;
                await supabase.from('orders').upsert(orderData);

                if (comments && comments.length > 0) {
                    const commentsWithOrderId = comments.map(c => ({
                        ...c,
                        orderId: order.id,
                        timestamp: new Date(c.timestamp).toISOString()
                    }));
                    await supabase.from('comments').upsert(commentsWithOrderId);
                }

                if (assistanceChecklist && assistanceChecklist.length > 0) {
                    const checklistWithOrderId = assistanceChecklist.map(item => ({
                        ...item,
                        orderId: order.id,
                        environmentId: null
                    }));
                    await supabase.from('checklist_items').upsert(checklistWithOrderId);
                }

                if (environments && environments.length > 0) {
                    for (const env of environments) {
                        const { checklist, ...envData } = env;
                        await supabase.from('environments').upsert({
                            ...envData,
                            orderId: order.id
                        });

                        if (checklist && checklist.length > 0) {
                            const envChecklistItems = checklist.map(item => ({
                                ...item,
                                orderId: null,
                                environmentId: env.id
                            }));
                            await supabase.from('checklist_items').upsert(envChecklistItems);
                        }
                    }
                }
            }
            console.log('✅ Ordens de serviço inseridas');
        } else {
            console.log('ℹ️  Banco de dados já contém dados');
        }

        // Verifica os dados
        const { data: allUsers } = await supabase.from('users').select('*');
        console.log(`\n👥 ${allUsers?.length || 0} usuários no banco:`, allUsers?.map(u => u.name));

        const { data: allOrders } = await supabase.from('orders').select('*');
        console.log(`📋 ${allOrders?.length || 0} ordens no banco:`, allOrders?.map(o => o.id));

        const { data: allNotifications } = await supabase.from('notifications').select('*');
        console.log(`🔔 ${allNotifications?.length || 0} notificações no banco`);

        console.log('\n✅ Conexão com Supabase estabelecida com sucesso!');
        console.log('🎉 Banco de dados inicializado e funcionando corretamente!');
    } catch (error) {
        console.error('❌ Erro ao testar conexão:', error);
    }
}

testConnection();
