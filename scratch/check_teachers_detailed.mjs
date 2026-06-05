import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_active, is_campus_active, is_groovelab_active, school_id')
    .in('role', ['teacher', 'admin', 'secretary', 'student']);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Total users fetched:", users.length);
  const teachers = users.filter(u => u.role === 'teacher');
  console.log("\n=== TEACHERS ===");
  teachers.forEach(t => {
    console.log(`ID: ${t.id} | Name: ${t.first_name} ${t.last_name} | is_active: ${t.is_active} | is_campus_active: ${t.is_campus_active} | is_groovelab_active: ${t.is_groovelab_active} | school: ${t.school_id}`);
  });

  const students = users.filter(u => u.role === 'student');
  console.log("\n=== STUDENTS (first 10) ===");
  students.slice(0, 10).forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.first_name} ${s.last_name} | is_active: ${s.is_active} | school: ${s.school_id}`);
  });

  console.log("\n=== ADMIN/SECRETARY ===");
  users.filter(u => u.role === 'admin' || u.role === 'secretary').forEach(a => {
    console.log(`ID: ${a.id} | Name: ${a.first_name} ${a.last_name} | Role: ${a.role} | is_active: ${a.is_active} | school: ${a.school_id}`);
  });
}

check().catch(console.error);
