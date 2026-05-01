// test-rls.ts
// Este script deve ser executado no ambiente NodeJS (não no frontend Vite) 
// ou através do próprio console (Dev Tools) para garantir que
// os Testes A/B estão isolados.

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const clientA = createClient(supabaseUrl, supabaseAnonKey);
const clientB = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log("🚀 Iniciando Testes RLS A/B");

  // 1. Criar e/ou Autenticar Usuário A
  // ATENÇÃO: As credenciais abaixo devem ser de clientes previamente cadastrados pela aplicação.
  const authA = await clientA.auth.signInWithPassword({
    email: 'clienteA@cma.com',
    password: '123'
  });
  console.log("Cliente A Auth:", authA.error ? authA.error.message : 'OK');

  const authB = await clientB.auth.signInWithPassword({
    email: 'clienteB@cma.com',
    password: '123'
  });
  console.log("Cliente B Auth:", authB.error ? authB.error.message : 'OK');

  if (authA.error || authB.error) {
    console.log("❌ Crie os usuários clienteA@cma.com e clienteB@cma.com via Interface (novo usuário) antes de rodar o teste.");
    return;
  }

  // 2. Teste: Cliente A puxando Ordens
  console.log("\n🔍 Cliente A tenta ler todas as ordens:");
  const resA = await clientA.from('orders').select('id, clientName');
  console.log(`Cliente A encontrou: ${resA.data?.length || 0} ordens.`);
  // O esperado é que seja > 0 (se ele tiver O.S) E <= ao total do banco, sem ver do cliente B

  // 3. Teste: Cliente B puxando Ordens
  console.log("\n🔍 Cliente B tenta ler todas as ordens:");
  const resB = await clientB.from('orders').select('id, clientName');
  console.log(`Cliente B encontrou: ${resB.data?.length || 0} ordens.`);

  // 4. Teste de Violação: Cliente A tentar apagar ou editar uma O.S. do Cliente B
  if (resB.data && resB.data.length > 0) {
      const orderB_id = resB.data[0].id;
      console.log(`\n🛡️ Cliente A tenta ler a ordem ${orderB_id} do Cliente B:`);
      const attackRes = await clientA.from('orders').select('id').eq('id', orderB_id);
      console.log(`Resultado do ataque (vazamento):`, attackRes.data?.length === 0 ? 'NENHUM VAZAMENTO (Certo) ✅' : 'VAZOU DADOS ❌');
      
      console.log(`\n🛡️ Cliente A tenta alterar Status da O.S do Cliente B:`);
      const attackUpdate = await clientA.from('orders').update({status: 'CANCELLED'}).eq('id', orderB_id);
      console.log(`Resultado do ataque Update:`, attackUpdate.error ? 'Bloqueado (Certo) ✅' : (attackUpdate.data || 'Zero modificado (Certo) ✅'));
  } else {
      console.log("\n⚠️Cliente B não tem ordens para testar violações.");
  }
}

runTests();
