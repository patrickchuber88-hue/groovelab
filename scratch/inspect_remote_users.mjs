import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email, is_campus_active, is_groovelab_active');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(JSON.stringify(users, null, 2));
}

inspect();
