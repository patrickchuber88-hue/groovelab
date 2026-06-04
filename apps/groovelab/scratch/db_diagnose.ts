import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });
dotenv.config({ path: 'apps/groovelab/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("=== Groovelab Database Diagnostics ===");
console.log("URL connected:", supabaseUrl);
console.log("Anon Key (truncated):", supabaseKey ? supabaseKey.substring(0, 15) + "..." : "undefined");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your env files!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  // 1. Check basic connection to users table
  console.log("\nTesting connection to 'users' table...");
  const { data: usersData, error: usersError } = await supabase.from('users').select('id').limit(1);
  if (usersError) {
    console.error("❌ Failed to query 'users' table:", usersError.message);
  } else {
    console.log("✅ Success! Successfully connected and queried 'users' table.");
  }

  // 2. Check if mission_templates table exists
  console.log("\nTesting query to 'mission_templates' table...");
  const { data: templatesData, error: templatesError } = await supabase.from('mission_templates').select('*').limit(1);
  if (templatesError) {
    console.error("❌ 'mission_templates' table check failed!");
    console.error("   Error Code:", templatesError.code);
    console.error("   Error Message:", templatesError.message);
  } else {
    console.log("✅ Success! 'mission_templates' table exists and is accessible.");
  }
}

diagnose();
