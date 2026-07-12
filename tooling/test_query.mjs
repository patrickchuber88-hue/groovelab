import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  // Read from .env.local manually
  import('fs').then(fs => {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
    const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
    const supabase = createClient(url, key);
    
    supabase.from('sessions').select('*, users(*)').is('check_out_time', null).then(({data, error}) => {
      console.log("Error:", error);
      console.log("Data:", JSON.stringify(data, null, 2));
    });
  });
}
