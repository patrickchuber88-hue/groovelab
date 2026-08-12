import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Searching for Manuel or Wagner or roles...");
  const filtered = users.filter(u => {
    const fn = (u.first_name || '').toLowerCase();
    const ln = (u.last_name || '').toLowerCase();
    return fn.includes('manuel') || ln.includes('wagner') || u.role === 'secretary' || u.role === 'admin';
  });

  filtered.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.first_name} ${u.last_name || ''} | Role: ${u.role} | QR: ${u.qr_token} | School: ${u.school_id} | Email: ${u.email}`);
  });
}
run();
