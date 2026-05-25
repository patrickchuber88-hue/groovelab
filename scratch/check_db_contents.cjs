const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: users, error } = await supabase.from('users').select('id, first_name, last_name, role, school_id, is_master_admin');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('USERS IN HETZNER DB:');
    console.log(JSON.stringify(users, null, 2));
  }
}

run();
