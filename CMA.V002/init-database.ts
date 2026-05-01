import { createClient } from '@supabase/supabase-js';
import { MOCK_USERS, INITIAL_ORDERS, INITIAL_NOTIFICATIONS } from './services/mockData';

const SUPABASE_URL = 'https://qhxsrxewfhumlmrwpjdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeHNyeGV3Zmh1bWxtcndwamRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc1MDEsImV4cCI6MjA4NTU2MzUwMX0.0wgZi9d3BcTlf7oCLdiLKRJAEt8XmML8m6JWCviH9R8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Iniciando população do banco de dados Supabase...\n');

async function initializeDatabase() {
    try {
        // 1. Inserir usuários
        console.log('👥 Inserindo usuários...');
        const { error: usersError } = await supabase.from('users').upsert(MOCK_USERS);
        if (usersError) throw usersError;
        console.log(`✅ ${MOCK_USERS.length} usuários inseridos`);

        // 2. Inserir notificações
        console.log('\n🔔 Inserindo notificações...');
        const { error: notificationsError } = await supabase.from('notifications').upsert(INITIAL_NOTIFICATIONS);
        if (notificationsError) throw notificationsError;
        console.log(`✅ ${INITIAL_NOTIFICATIONS.length} notificações inseridas`);

        // 3. Inserir ordens e seus relacionamentos
        console.log('\n📋 Inserindo ordens de serviço...');
        for (const order of INITIAL_ORDERS) {
            const { assistanceChecklist, environments, comments, ...orderData } = order;

            // Inserir ordem principal
            const { error: orderError } = await supabase.from('orders').upsert(orderData);
            if (orderError) throw orderError;
            console.log(`  ✅ Ordem ${order.id} inserida`);

            // Inserir comentários
            if (comments && comments.length > 0) {
                const commentsWithOrderId = comments.map(c => ({
                    ...c,
                    orderId: order.id,
                    timestamp: new Date(c.timestamp).toISOString()
                }));
                const { error: commentsError } = await supabase.from('comments').upsert(commentsWithOrderId);
                if (commentsError) throw commentsError;
                console.log(`    ✅ ${comments.length} comentário(s) inserido(s)`);
            }

            // Inserir checklist de assistência
            if (assistanceChecklist && assistanceChecklist.length > 0) {
                const checklistWithOrderId = assistanceChecklist.map(item => ({
                    ...item,
                    orderId: order.id,
                    environmentId: null
                }));
                const { error: checklistError } = await supabase.from('checklist_items').upsert(checklistWithOrderId);
                if (checklistError) throw checklistError;
                console.log(`    ✅ ${assistanceChecklist.length} item(s) de checklist inserido(s)`);
            }

            // Inserir ambientes e seus checklists
            if (environments && environments.length > 0) {
                for (const env of environments) {
                    const { checklist, ...envData } = env;

                    // Inserir ambiente
                    const { error: envError } = await supabase.from('environments').upsert({
                        ...envData,
                        orderId: order.id
                    });
                    if (envError) throw envError;
                    console.log(`    ✅ Ambiente "${env.name}" inserido`);

                    // Inserir checklist do ambiente
                    if (checklist && checklist.length > 0) {
                        const envChecklistItems = checklist.map(item => ({
                            ...item,
                            orderId: null,
                            environmentId: env.id
                        }));
                        const { error: envChecklistError } = await supabase.from('checklist_items').upsert(envChecklistItems);
                        if (envChecklistError) throw envChecklistError;
                        console.log(`      ✅ ${checklist.length} item(s) de checklist do ambiente inserido(s)`);
                    }
                }
            }
        }

        // 4. Verificar dados inseridos
        console.log('\n📊 Verificando dados inseridos...');
        const { data: users } = await supabase.from('users').select('*');
        const { data: orders } = await supabase.from('orders').select('*');
        const { data: comments } = await supabase.from('comments').select('*');
        const { data: environments } = await supabase.from('environments').select('*');
        const { data: checklistItems } = await supabase.from('checklist_items').select('*');
        const { data: notifications } = await supabase.from('notifications').select('*');

        console.log('\n✅ Resumo dos dados inseridos:');
        console.log(`   👥 Usuários: ${users?.length || 0}`);
        console.log(`   📋 Ordens: ${orders?.length || 0}`);
        console.log(`   💬 Comentários: ${comments?.length || 0}`);
        console.log(`   🏠 Ambientes: ${environments?.length || 0}`);
        console.log(`   ✓ Itens de checklist: ${checklistItems?.length || 0}`);
        console.log(`   🔔 Notificações: ${notifications?.length || 0}`);

        console.log('\n🎉 Banco de dados inicializado com sucesso!');
        console.log('🚀 Você pode agora iniciar a aplicação com: npm run dev');

    } catch (error) {
        console.error('\n❌ Erro ao inicializar banco de dados:', error);
        process.exit(1);
    }
}

initializeDatabase();
