import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  console.log("=== SCHOOLS ===");
  const { data: schools, error: sErr } = await supabase.from('schools').select('id, name');
  if (sErr) console.error("Error schools:", sErr);
  schools?.forEach(s => console.log(`School ID: ${s.id} | Name: ${s.name}`));

  console.log("\n=== USERS (COUNT BY ROLE & SCHOOL) ===");
  const { data: users, error: uErr } = await supabase.from('users').select('id, role, school_id');
  if (uErr) console.error("Error users:", uErr);
  const userCounts = {};
  users?.forEach(u => {
    const key = `${u.school_id}_${u.role}`;
    userCounts[key] = (userCounts[key] || 0) + 1;
  });
  console.log(userCounts);

  console.log("\n=== SUBJECTS (COUNT BY SCHOOL) ===");
  const { data: subjects, error: subErr } = await supabase.from('subjects').select('id, name, school_id');
  if (subErr) console.error("Error subjects:", subErr);
  const subCounts = {};
  subjects?.forEach(s => {
    subCounts[s.school_id] = (subCounts[s.school_id] || 0) + 1;
  });
  console.log(subCounts);
}
check().catch(console.error);
