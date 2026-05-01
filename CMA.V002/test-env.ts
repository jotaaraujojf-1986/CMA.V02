import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qhxsrxewfhumlmrwpjdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeHNyeGV3Zmh1bWxtcndwamRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODc1MDEsImV4cCI6MjA4NTU2MzUwMX0.0wgZi9d3BcTlf7oCLdiLKRJAEt8XmML8m6JWCviH9R8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { error } = await supabase.from('environments').upsert({
    id: 'test-env-123',
    name: 'Test Env',
    estimatedDays: 1,
    status: 'PENDING',
    orderId: 'OS-1234',
    value_brl: 50.00
  });

  if (error) {
    console.error('Error upserting environment:', error);
  } else {
    console.log('Successfully upserted environment with value_brl');
  }
}

test();
