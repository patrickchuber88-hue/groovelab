import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read env variables
const envLocal = fs.readFileSync('apps/groovelab/.env.local', 'utf8');
const supabaseUrl = envLocal.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envLocal.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

async function run() {
  // 1. Find a real student ID from public.users_raw
  const masterSupabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY, {
    auth: { persistSession: false }
  });
  
  const { data: users, error: userError } = await masterSupabase
    .from('users_raw')
    .select('id')
    .eq('role', 'student')
    .limit(1);
    
  if (userError || !users || users.length === 0) {
    console.error("Could not find a student to test with:", userError);
    process.exit(1);
  }
  
  const studentId = users[0].id;
  console.log("Testing with student ID:", studentId);
  
  // 2. Create client simulating the frontend (anon key + custom fetch with header)
  const clientFetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-user-id', studentId);
    return fetch(input, { ...init, headers });
  };
  
  const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { fetch: clientFetch }
  });
  
  // 3. Test insert
  console.log("Testing insert...");
  const mockCredId = 'mock-credential-' + Math.random();
  const { data: insertData, error: insertError } = await clientSupabase
    .from('user_credentials')
    .insert({
      user_id: studentId,
      credential_id: mockCredId,
      public_key: 'mock-public-key',
      device_name: 'Test Device'
    })
    .select();
    
  if (insertError) {
    console.error("Insert failed:", insertError.message);
  } else {
    console.log("Insert succeeded!", insertData);
  }
  
  // 4. Test select via RPC (anonymously, no header)
  console.log("Testing select via RPC anonymously...");
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  const { data: rpcData, error: rpcError } = await anonSupabase
    .rpc('get_user_id_by_credential', { input_credential_id: mockCredId });
    
  if (rpcError) {
    console.error("RPC failed:", rpcError.message);
  } else {
    console.log("RPC succeeded! Returned user_id:", rpcData);
  }
  
  // 5. Cleanup
  console.log("Cleaning up mock credential...");
  const { error: deleteError } = await clientSupabase
    .from('user_credentials')
    .delete()
    .eq('credential_id', mockCredId);
    
  if (deleteError) {
    console.error("Cleanup failed:", deleteError.message);
  } else {
    console.log("Cleanup succeeded!");
  }
}

run();
