import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.campus_direct_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      is_read BOOLEAN DEFAULT false NOT NULL
    );

    ALTER TABLE public.campus_direct_messages DISABLE ROW LEVEL SECURITY;

    GRANT ALL ON public.campus_direct_messages TO authenticated, anon, service_role;
  `;
  console.log('Executing SQL...');
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error('execute_sql failed, trying exec_sql fallback:', error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('exec_sql', { query: sql });
    console.log('Result fallback:', { data: dataFallback, error: errorFallback });
  } else {
    console.log('Result:', { data, error });
  }
}

createTable();
