import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking column types for users table...');
  
  // We can query information_schema if we have permissions, 
  // but with anon key we usually don't.
  // Instead, we'll try to insert a test value and see what happens, 
  // or just fetch one and look at the metadata if possible.
  
  const { data, error } = await supabase
    .from('users')
    .select('bands, projects, musical_styles')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample Data:', data[0]);
  console.log('Types:');
  console.log('bands:', typeof data[0].bands);
  console.log('projects:', typeof data[0].projects);
  console.log('musical_styles:', typeof data[0].musical_styles);
}

checkSchema();
