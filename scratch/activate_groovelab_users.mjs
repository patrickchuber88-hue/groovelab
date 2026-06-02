import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateUsers() {
  console.log('Activating GrooveLab for all student and teacher users...');

  const { data: updated, error } = await supabase
    .from('users')
    .update({ is_groovelab_active: true })
    .in('role', ['student', 'teacher']);

  if (error) {
    console.error('Error activating users:', error);
    return;
  }

  console.log('Successfully activated GrooveLab for all student and teacher users.');
}

activateUsers();
