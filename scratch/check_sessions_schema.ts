import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Querying Active Sessions with Correct Joins ---');
  const { data: userSample } = await supabase.from('users').select('school_id').limit(1).single();
  const schoolId = userSample?.school_id;
  console.log('Using schoolId:', schoolId);

  if (!schoolId) {
    console.log('No schoolId found, aborting.');
    return;
  }

  const { data: sSes, error } = await supabase
    .from('sessions')
    .select('*, profiles:users!inner(*), stations(*)')
    .eq('profiles.school_id', schoolId)
    .is('check_out_time', null)
    .order('check_in_time', { ascending: false });

  if (error) {
    console.error('ERROR in sessions query:', error);
  } else {
    console.log('Success! Active sessions count:', sSes?.length);
    console.log('Data:', sSes);
  }
}

main();
