import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .limit(100);

  if (error) {
    console.error("Direct query failed:", error);
  } else {
    const roles = Array.from(new Set(data.map(d => d.role)));
    console.log("Found roles in users:", roles);
    console.log("Total users count:", data.length);
  }
}
check();
