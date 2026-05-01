import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, users(*)')
    .is('check_out_time', null);
  
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data && data.length > 0) {
    console.log("First record users prop:", data[0].users);
  }
}
test();
