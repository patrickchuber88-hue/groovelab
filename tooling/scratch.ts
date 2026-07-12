import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBands() {
  const { data: schools } = await supabase.from('schools').select('id, name');
  console.log("Schools:", schools);

  const { data: bands, error } = await supabase.from('bands').select('*');
  console.log("Bands Error:", error);
  console.log("Bands count:", bands?.length);
  
  if (bands && schools) {
    for (const school of schools) {
      const schoolBands = bands.filter(b => b.school_id === school.id);
      console.log(`School: ${school.name} has ${schoolBands.length} bands.`);
      console.log(`Bands:`, schoolBands.map(b => b.name));
    }
  }
}

checkBands();
