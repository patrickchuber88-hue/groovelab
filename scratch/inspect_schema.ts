import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in users table:', Object.keys(data[0]));
    console.log('Sample user record:', data[0]);
  } else {
    console.log('No users found.');
  }
}
run();
