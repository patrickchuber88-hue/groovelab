import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  const { data: kiosks, error } = await supabase
    .from('kiosks')
    .select('*, rooms(name, school_id)');

  if (error) {
    console.error("Error querying kiosks table:", error);
    return;
  }

  console.log(`=== KIOSKS / MENU BOARDS (${kiosks.length}) ===`);
  console.log(JSON.stringify(kiosks, null, 2));
}

run();
