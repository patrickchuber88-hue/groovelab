import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('Checking songs table status...');
  
  // We can try to insert a test song and see the error details
  const { data, error } = await supabase
    .from('songs')
    .insert([{
      school_id: '11111111-1111-1111-1111-111111111111',
      artist: 'TEST',
      title: 'TEST',
      level: 1
    }]);

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success! (RLS might be disabled or working)');
    // Clean up
    await supabase.from('songs').delete().eq('artist', 'TEST');
  }
}

checkRLS();
