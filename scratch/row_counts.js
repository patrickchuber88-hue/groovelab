import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const tables = ['schools', 'users', 'bands', 'band_members', 'songs', 'schedules', 'rooms', 'sessions', 'lab_planning'];

for (const table of tables) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`${table}: Error ${error.message}`);
  } else {
    console.log(`${table}: ${count} rows`);
  }
}
