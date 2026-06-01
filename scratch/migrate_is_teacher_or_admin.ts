import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const sql = `
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_role public.user_role;
BEGIN
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
    
    SELECT role INTO v_role
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN v_role IN ('teacher', 'admin', 'secretary');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

NOTIFY pgrst, 'reload schema';
`;

async function run() {
  console.log("Updating is_teacher_or_admin function to allow 'secretary' role...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result Fallback:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}
run();
