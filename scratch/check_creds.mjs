import dotenv from 'dotenv';
import fs from 'fs';

// Read env variables
const envLocal = fs.readFileSync('apps/groovelab/.env.local', 'utf8');
const supabaseUrl = envLocal.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envLocal.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('user_credentials').select('*');
  if (error) {
    console.error("Error fetching credentials:", error.message);
  } else {
    console.log("Credentials stored in DB:", JSON.stringify(data, null, 2));
  }
}
run();
