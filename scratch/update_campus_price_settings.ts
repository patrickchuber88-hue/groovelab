import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '97e73f5d-b6d6-47d5-bb47-18ad02bae725'
    }
  }
});

async function run() {
  console.log("Fetching master billing settings...");
  const { data, error } = await supabase
    .from('master_billing_settings')
    .select('*');

  if (error) {
    console.error("❌ Failed to fetch settings:", error.message);
  } else {
    console.log("✅ Current rows:", data);
  }
}
run();
