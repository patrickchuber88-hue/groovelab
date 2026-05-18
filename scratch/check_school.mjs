import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: schools, error } = await supabase.from('schools').select('*');
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log('Schools:', JSON.stringify(schools, null, 2));
  }
}
run();
