import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: boris, error: err1 } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%Boris%');
  console.log('Boris:', boris, err1);

  const { data: felix, error: err2 } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%Felix%');
  console.log('Felix:', felix, err2);
}

run();
