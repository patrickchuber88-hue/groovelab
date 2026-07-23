import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Dropping RLS policies from users_raw...");
  const { data, error } = await supabaseAdmin.rpc('execute_sql', {
    sql_query: `
      DROP POLICY IF EXISTS "Allow select teacher profiles" ON public.users_raw;
      DROP POLICY IF EXISTS "Allow select student profiles" ON public.users_raw;
      ALTER TABLE public.users_raw DISABLE ROW LEVEL SECURITY;
    `
  });
  console.log("Result:", data || "Success");
  if (error) console.error("Error:", error);
}
run();
