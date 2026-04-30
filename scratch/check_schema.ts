import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const tables = ['jam_requests', 'help_requests'];
  for (const table of tables) {
    console.log(`--- Schema for ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (data && data.length > 0) {
      console.log('Sample row keys:', Object.keys(data[0]));
    } else if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('No data to infer schema.');
    }
  }
}

checkSchema();
