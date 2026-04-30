import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function repair() {
  console.log('Repairing profiles...');
  
  // Repair Patrick Huber
  const { error: err1 } = await supabase
    .from('users')
    .update({ 
      bands: ['sameday'], 
      projects: [], 
      musical_styles: [] 
    })
    .eq('id', '88888888-8888-8888-8888-888888888888');

  if (err1) console.error('Error repairing Patrick:', err1);
  else console.log('Patrick Huber repaired.');

  // Repair Boris Stoll
  const { error: err2 } = await supabase
    .from('users')
    .update({ 
      bands: [], 
      projects: [], 
      musical_styles: [] 
    })
    .eq('id', '99999999-9999-9999-9999-999999999999');

  if (err2) console.error('Error repairing Boris:', err2);
  else console.log('Boris Stoll repaired.');
}

repair();
