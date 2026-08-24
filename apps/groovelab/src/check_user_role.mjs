import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: planning, error } = await supabase
    .from('lab_planning')
    .select('*');
  console.log('LAB PLANNING ENTRIES:', planning);
  console.log('ERROR:', error);
}

run();
