import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(supabaseUrl, serviceKey);

async function queryPg() {
  const sql = `
    DO $$
    DECLARE
      v_uid UUID;
      v_is_admin BOOLEAN;
    BEGIN
      v_uid := auth.uid();
      v_is_admin := public.is_master_admin();
      RAISE EXCEPTION 'auth.uid: %, is_master_admin: %', v_uid, v_is_admin;
    END;
    $$;
  `;
  const { data, error } = await client.rpc('execute_sql', { sql_query: sql });
  console.log('Error output:', error);
}

queryPg();
