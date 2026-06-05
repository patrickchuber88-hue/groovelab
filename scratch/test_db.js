import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

try {
  const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local';
  const env = fs.readFileSync(envPath, 'utf-8');
  const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  
  console.log('Supabase URL:', url);
  const supabase = createClient(url, key);
  
  const tables = ['schools', 'users', 'bands', 'band_members', 'songs', 'schedules', 'rooms', 'sessions', 'lab_planning'];
  
  console.log('--- Row Counts for Main Tables ---');
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table "${table}": Error -> ${error.message} (${error.code})`);
    } else {
      console.log(`Table "${table}": ${count} rows`);
    }
  }
  
  console.log('\n--- Checking current users in "users" table ---');
  const { data: users, error: usersErr } = await supabase.from('users').select('id, first_name, last_name, role, school_id');
  if (usersErr) {
    console.error('Error fetching users:', usersErr);
  } else {
    users.forEach(u => {
      console.log(`  - User: ${u.first_name} ${u.last_name || ''} | Role: ${u.role} | SchoolID: ${u.school_id} | ID: ${u.id}`);
    });
  }

  console.log('\n--- Checking "schools" table ---');
  const { data: schools, error: schoolsErr } = await supabase.from('schools').select('id, name');
  if (schoolsErr) {
    console.error('Error fetching schools:', schoolsErr);
  } else {
    schools.forEach(s => {
      console.log(`  - School: ${s.name} | ID: ${s.id}`);
    });
  }

} catch (e) {
  console.error('Exception:', e);
}
