const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase.from('rooms').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns in rooms:', Object.keys(data[0] || {}));
  }
}
checkColumns();
