import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Applying database performance indexes...");
  
  const queries = [
    { name: "fokus_logs", sql: "CREATE INDEX IF NOT EXISTS idx_fokus_logs_user_id_created_at ON public.fokus_logs(user_id, created_at DESC);" },
    { name: "practice_sessions", sql: "CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_id_created_at ON public.practice_sessions(student_id, created_at DESC);" },
    { name: "user_song_skills", sql: "CREATE INDEX IF NOT EXISTS idx_user_song_skills_user_id ON public.user_song_skills(user_id);" },
    { name: "schedules student", sql: "CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON public.schedules(student_id);" },
    { name: "schedules teacher", sql: "CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON public.schedules(teacher_id);" },
    { name: "schedules school", sql: "CREATE INDEX IF NOT EXISTS idx_schedules_school_id ON public.schedules(school_id);" },
    { name: "invoices school", sql: "CREATE INDEX IF NOT EXISTS idx_invoices_school_id ON public.invoices(school_id);" },
    { name: "invoices type", sql: "CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);" }
  ];

  for (const q of queries) {
    console.log(`Creating index for ${q.name}...`);
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: q.sql });
    if (error) {
      console.warn(`Could not create index for ${q.name}:`, error.message);
    } else {
      console.log(`Successfully indexed ${q.name}.`);
    }
  }
}
run();
