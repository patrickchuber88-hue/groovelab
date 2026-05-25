const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: schools, error } = await supabase.from('schools').select('*');
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log('SCHOOLS IN HETZNER DB:');
    console.log(JSON.stringify(schools, null, 2));
  }
}

run();
