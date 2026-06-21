import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, instrument');
  
  if (error) {
    console.error(error);
  } else {
    console.log("Teachers in DB with instruments:");
    data.forEach(u => {
      console.log(`- ${u.first_name} ${u.last_name} (${u.role}): Instrument: "${u.instrument || 'None'}"`);
    });
  }
}
run();
