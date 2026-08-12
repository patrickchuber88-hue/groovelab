import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: cols, error } = await supabase
    .from('schedules')
    .select('*')
    .limit(1);
    
  if (error) console.error(error);
  else if (cols.length > 0) console.log("Columns in schedules:", Object.keys(cols[0]));
}

run();
