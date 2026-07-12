import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  console.log('Users in DB:');
  users.forEach((u: any) => {
    console.log(`- ID: ${u.id}, Name: ${u.first_name} ${u.last_name || ''}, Role: ${u.role}, School ID: ${u.school_id}, IsMasterAdmin: ${u.is_master_admin}`);
  });
}
run();
