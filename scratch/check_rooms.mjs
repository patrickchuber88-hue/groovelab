import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
  console.log("Rooms detail:");
  rooms.forEach(r => {
    console.log(`- Room: "${r.name}" (${r.id}), is_groovelab_active: ${r.is_groovelab_active}`);
  });
}

run();
