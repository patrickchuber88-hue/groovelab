import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSession() {
  const { data: user } = await supabase
    .from('users')
    .select('id, full_name')
    .ilike('full_name', '%Janosch%')
    .single();

  if (!user) {
    console.log('User Janosch not found');
    return;
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('*, stations(name)')
    .eq('user_id', user.id)
    .is('check_out_time', null)
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Latest active session for Janosch:');
  console.log(JSON.stringify(session, null, 2));
}

checkSession();
