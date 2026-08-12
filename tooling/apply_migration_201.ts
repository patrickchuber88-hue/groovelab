import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Applying Migration 201...");
  
  const sqlStatements = [
    "ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_target_days INTEGER;",
    "ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_days_completed INTEGER DEFAULT 0;",
    "ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_bonus_claimed BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS practice_anchor TEXT;",
    "ALTER TABLE public.student_stats ADD COLUMN IF NOT EXISTS weekly_goal_selected_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS mood TEXT;"
  ];

  for (const sql of sqlStatements) {
    console.log(`Running SQL: ${sql}`);
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
      console.error("Error executing query:", error);
    } else {
      console.log("Successfully executed.");
    }
  }
}
run();
