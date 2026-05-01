import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

// We can't directly check schema easily without RPC or similar, 
// but we can try to fetch a record and see the format.
supabase.from('users').select('qr_token').limit(1).then(({data, error}) => {
  console.log("Data:", data);
  console.log("Error:", error);
});
