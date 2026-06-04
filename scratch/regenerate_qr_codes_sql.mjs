import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const sql = `
    -- 1. Update students
    UPDATE users
    SET 
      qr_token = gen_random_uuid(),
      teacher_qr_token = null,
      is_pin_activated = false,
      ausweis_nummer = 'GL-' || floor(1000 + random() * 9000)::text
    WHERE 
      role = 'student' 
      AND (is_master_admin IS NOT TRUE);

    -- 2. Update teachers (excluding admins/secretaries/masters)
    UPDATE users
    SET 
      teacher_qr_token = 't_' || substring(md5(random()::text) from 1 for 24),
      qr_token = null,
      is_pin_activated = false,
      ausweis_nummer = (
        CASE 
          WHEN is_campus_active = true AND is_groovelab_active = true THEN 'CG-'
          WHEN is_campus_active = true THEN 'C-'
          WHEN is_groovelab_active = true THEN 'G-'
          ELSE 'C-'
        END
      ) || floor(1000 + random() * 9000)::text
    WHERE 
      role = 'teacher' 
      AND (is_master_admin IS NOT TRUE)
      AND role NOT IN ('secretary', 'admin');
  `;

  console.log("Executing SQL migration via RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Migration executed successfully:", { data });
  }
}

run();
