import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deactivateGroove() {
  console.log('Deactivating Groove for all students and teachers except Patrick Huber...');

  const { data: updated, error } = await supabase
    .from('users')
    .update({ is_groovelab_active: false })
    .in('role', ['student', 'teacher'])
    .neq('id', '03564b1c-e2bb-4ccb-be95-b9fd1ef34829');

  if (error) {
    console.error('Error deactivating Groove:', error);
    return;
  }

  console.log('Successfully reverted Groove activation for other users.');
}

deactivateGroove();
