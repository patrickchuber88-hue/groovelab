import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Schools in database:");
    data.forEach(s => {
      console.log(`- ID: ${s.id}, Name: "${s.name}", City: "${s.city}", Zip: "${s.zip_code}", Subdomain: "${s.subdomain}"`);
    });
  }
}

run();
