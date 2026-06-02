import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateCampus() {
  console.log('Activating Campus for all student and teacher users...');

  const { data: updated, error } = await supabase
    .from('users')
    .update({ is_campus_active: true })
    .in('role', ['student', 'teacher']);

  if (error) {
    console.error('Error activating Campus:', error);
    return;
  }

  console.log('Successfully activated Campus for all student and teacher users.');
}

activateCampus();
