import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAurora() {
  console.log('Fetching user Aurora Dominguez...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('first_name', 'Aurora')
    .eq('last_name', 'Dominguez')
    .single();

  if (error) {
    console.error('Fetch failed:', error);
  } else {
    console.log('User ID:', data.id);
    console.log('User school_id:', data.school_id);
    console.log('User qr_token:', data.qr_token);
    
    // Now fetch the school
    if (data.school_id) {
      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .eq('id', data.school_id)
        .single();
      if (schoolErr) {
        console.error('School fetch failed:', schoolErr);
      } else {
        console.log('School name:', school.name);
        console.log('School city:', school.city);
      }
    }
  }
}

checkAurora();
