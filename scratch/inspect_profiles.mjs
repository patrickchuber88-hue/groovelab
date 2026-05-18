import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env.local manually
const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const ids = [
    "336f009c-fe9d-462f-abcc-24a1dc840f68",
    "3e94f08d-200c-4b84-af0a-2a98c508cfd4",
    "55555555-5555-5555-5555-555555555555"
  ];
  
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, role')
    .in('id', ids);
    
  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }
  
  console.log("Profiles details:");
  console.log(JSON.stringify(data, null, 2));
}

main();
