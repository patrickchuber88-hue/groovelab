import { createClient } from '@supabase/supabase-js'

import('fs').then(fs => {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
  const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
  const supabase = createClient(url, key);
  
  supabase.from('sessions').select('*, users(*), stations(*)').is('check_out_time', null).then(({data, error}) => {
    console.log("Data:", JSON.stringify(data, null, 2));
  });
});
