import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const client = createClient(supabaseUrl, serviceKey);

async function queryPg() {
  const sql = `
    DO $$
    DECLARE
      r RECORD;
      msg TEXT := '';
    BEGIN
      FOR r IN SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'schools' LOOP
        msg := msg || 'Policy: ' || COALESCE(r.policyname, 'NULL') || E'\n'
                   || '  cmd: ' || COALESCE(r.cmd, 'NULL') || E'\n'
                   || '  roles: ' || COALESCE(array_to_string(r.roles, ','), 'NULL') || E'\n'
                   || '  qual: ' || COALESCE(r.qual, 'NULL') || E'\n'
                   || '  with_check: ' || COALESCE(r.with_check, 'NULL') || E'\n';
      END LOOP;
      RAISE EXCEPTION 'POLICIES DETAILS: %', msg;
    END;
    $$;
  `;
  const { data, error } = await client.rpc('execute_sql', { sql_query: sql });
  console.log('Error output:', error);
}

queryPg();
