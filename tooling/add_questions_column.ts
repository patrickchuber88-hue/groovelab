import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

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
