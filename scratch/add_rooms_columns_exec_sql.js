const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "groovelab_räume" JSONB DEFAULT '[]';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "campus_räume" JSONB DEFAULT '[]';
    
    -- Sync existing planned_boards to groovelab_räume as initial migration
    UPDATE public.users 
    SET "groovelab_räume" = planned_boards 
    WHERE planned_boards IS NOT NULL AND ("groovelab_räume" IS NULL OR "groovelab_räume" = '[]'::jsonb);

    NOTIFY pgrst, 'reload schema';
  `;
  console.log("Executing column additions via exec_sql RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log("Result:", { data, error });
}
run();
