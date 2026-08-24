import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllSchools() {
  console.log('Fetching all schools...');
  const { data, error } = await supabase
    .from('schools')
    .select('*');

  if (error) {
    console.error('Fetch failed:', error);
  } else {
    data.forEach(s => {
      console.log(`- School ID: ${s.id}, Name: "${s.name}", City: "${s.city}"`);
    });
  }
}

checkAllSchools();
