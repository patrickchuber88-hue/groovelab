import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Restricting crisis_notifications SELECT policy to authenticated users...");

  const sqlStatements = [
    `DROP POLICY IF EXISTS crisis_notifications_select ON public.crisis_notifications;`,
    `CREATE POLICY crisis_notifications_select ON public.crisis_notifications 
    FOR SELECT 
    TO authenticated 
    USING (
      student_id = public.get_current_user_id()
      OR EXISTS (
        SELECT 1 FROM public.users_raw u
        WHERE u.id = crisis_notifications.teacher_id
          AND u.school_id = public.current_school_id()
      )
    );`
  ];

  for (let i = 0; i < sqlStatements.length; i++) {
    const stmt = sqlStatements[i];
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: stmt });
    if (error) {
      console.error(`Error executing stmt ${i + 1}:`, error);
    } else {
      console.log(`Statement ${i + 1} succeeded.`);
    }
  }

  console.log("crisis_notifications_select updated.");
}

run().catch(console.error);
