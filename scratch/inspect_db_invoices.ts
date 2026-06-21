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
  console.log("Querying invoices table...");
  const { data, error } = await supabase
    .from('invoices')
    .select('*');

  if (error) {
    console.error("❌ Failed to query invoices:", error.message);
  } else {
    console.log("✅ Invoices in DB:", JSON.stringify(data, null, 2));
  }
}
run();
