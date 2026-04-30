import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token')
    .order('role', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('\n--- ALL USERS & QR TOKENS ---');
  users?.forEach(u => {
    console.log(`[${u.role.toUpperCase()}] ${u.first_name} ${u.last_name} | QR: ${u.qr_token}`);
  });
}

listUsers();
