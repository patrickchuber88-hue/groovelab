import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Adding no_submission_teacher_ids column...");
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql_query: `ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS no_submission_teacher_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL;` 
  });
  console.log("Result:", JSON.stringify({ data, error }, null, 2));
}
run();
