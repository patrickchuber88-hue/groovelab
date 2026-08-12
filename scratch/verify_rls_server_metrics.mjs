import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
// We use the anon key or a normal anon client
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testRLS() {
  console.log('=== Checking RLS on server_metrics ===\n');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Try to read with anonymous client
  console.log('Testing SELECT with Anon Client...');
  const { data: anonData, error: anonError } = await anonClient
    .from('server_metrics')
    .select('*')
    .limit(1);

  if (anonError) {
    console.log(`✅ Success: Anon client select was rejected with error: ${anonError.message}`);
  } else if (anonData && anonData.length === 0) {
    console.log(`✅ Success: Anon client select returned 0 rows (RLS filtered all data successfully).`);
  } else {
    console.log(`❌ Failure: Anon client successfully read metrics:`, anonData);
  }

  // 2. Try to read with Service Role client
  console.log('\nTesting SELECT with Service Role Client...');
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('server_metrics')
    .select('*')
    .limit(1);

  if (serviceError) {
    console.log(`❌ Failure: Service role could not query server_metrics. Error: ${serviceError.message}`);
  } else {
    console.log(`✅ Success: Service role read metrics successfully. Data:`, serviceData);
  }

  // 3. Try to insert with Service Role client
  console.log('\nTesting INSERT with Service Role Client...');
  const { data: insertData, error: insertError } = await serviceClient
    .from('server_metrics')
    .insert([{
      cpu_load: 0.25,
      mem_used_mb: 2048,
      mem_total_mb: 8192,
      swap_used_mb: 0,
      active_connections: 5
    }])
    .select();

  if (insertError) {
    console.log(`❌ Failure: Service role could not insert server_metrics. Error: ${insertError.message}`);
  } else {
    console.log(`✅ Success: Service role inserted metrics successfully. Data:`, insertData);
    
    // Clean up test entry
    if (insertData && insertData[0]) {
      await serviceClient.from('server_metrics').delete().eq('id', insertData[0].id);
    }
  }
}

testRLS().catch(console.error);
