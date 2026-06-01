import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sql = `
    ALTER TABLE public.campus_direct_messages ADD COLUMN IF NOT EXISTS occurrence_id TEXT;
    CREATE INDEX IF NOT EXISTS campus_direct_messages_occurrence_id_idx ON public.campus_direct_messages(occurrence_id);
  `;
  console.log('Executing migration SQL...');
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error('execute_sql failed, trying exec_sql fallback:', error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('exec_sql', { query: sql });
    console.log('Result fallback:', { data: dataFallback, error: errorFallback });
  } else {
    console.log('Result:', { data, error });
  }
}

runMigration();
