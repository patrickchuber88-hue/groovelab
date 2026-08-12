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
  const { data: pDef }: any = await supabase.rpc('get_sql_json', {
    query: `SELECT prosrc FROM pg_proc WHERE proname = 'get_current_user_id'`
  });
  console.log('get_current_user_id source:', pDef[0]?.prosrc);
}

run().catch(console.error);
