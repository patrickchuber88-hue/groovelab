import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const client = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: user } = await client
    .from('users')
    .select('id, first_name, last_name, teacher_availability')
    .eq('id', '11079eae-664a-49a4-8692-771d83a3193c')
    .single();

  console.log('Teacher Availability for Patrick Huber:');
  console.log(JSON.stringify(user?.teacher_availability, null, 2));
}

main().catch(console.error);
