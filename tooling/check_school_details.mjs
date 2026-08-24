import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchool() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  console.log('Fetching school with id:', schoolId);
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();

  if (error) {
    console.error('Fetch failed with error:', error);
  } else {
    console.log('School name:', data.name);
    console.log('School data:', data);
  }
}

checkSchool();
