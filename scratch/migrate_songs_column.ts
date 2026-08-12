import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const sql = `
    ALTER TABLE public.campus_event_program_points 
    ADD COLUMN IF NOT EXISTS songs JSONB DEFAULT '[]'::jsonb NOT NULL;
  `;
  console.log("Running migration from project scratch...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Migration Result:", JSON.stringify({ data, error }, null, 2));
}
run();
