import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
        exception_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(schedule_id, exception_date)
    );

    ALTER TABLE public.schedule_exceptions DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.schedule_exceptions TO authenticated, anon, service_role;

    NOTIFY pgrst, 'reload schema';
  `;

  console.log("Applying exception migration on remote database...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}
run();
