import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Adding questions column to campus_feedback_requests table...");
  const sql = `
    ALTER TABLE public.campus_feedback_requests
      ADD COLUMN IF NOT EXISTS questions TEXT[];
    
    NOTIFY pgrst, 'reload schema';
  `;
  
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Error executing SQL:", error);
    process.exit(1);
  } else {
    console.log("Successfully added questions column and reloaded PostgREST schema cache.");
  }
}
run();
