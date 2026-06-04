const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runQuery() {
  const { data, error } = await supabase.from('rooms').select('*').eq('is_groovelab_active', true);
  console.log('Data:', data);
  console.log('Error:', error);
}
runQuery();
