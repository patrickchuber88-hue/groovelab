import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
