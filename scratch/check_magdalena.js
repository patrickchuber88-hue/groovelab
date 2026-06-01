const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('schedule_occurrences')
    .select('*')
    .eq('id', 'e3fbebed-c586-432e-8754-89b270a046f0')
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log("Magdalena's Occurrence record:", data);
  }
}
run();
