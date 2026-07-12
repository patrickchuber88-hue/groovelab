import { createClient } from '@supabase/supabase-js'

import('fs').then(fs => {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
  const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
  const supabase = createClient(url, key);
  
  const schoolId = '11111111-1111-1111-1111-111111111111'; // from previous test

  supabase.from('sessions')
    .select('*, users!inner(*), songs(*), stations(*)')
    .is('check_out_time', null)
    .eq('users.school_id', schoolId)
    .then(({data, error}) => {
      console.log("Error:", error);
      console.log("Data length:", data?.length);
    });
});
