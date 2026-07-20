import { createClient } from '@supabase/supabase-js';
const url = 'https://supabase.campus-groovelab.de';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(url, key);

async function check() {
  const { data: users, error } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, is_campus_active, is_groovelab_active, status');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');
  const students = users.filter(u => u.role === 'student');

  console.log('=== LEHRKRAFT LISTE ===');
  teachers.forEach(t => {
    console.log(`Lehrer: ${t.first_name} ${t.last_name} (ID: ${t.id}, Role: ${t.role})`);
  });

  console.log('\n=== SCHÜLER LISTE & ZUWEISUNGEN ===');
  students.forEach(s => {
    const t = teachers.find(teach => teach.id === s.teacher_id);
    const tName = t ? `${t.first_name} ${t.last_name}` : 'Keine Zuweisung';
    console.log(`Schüler: ${s.first_name} ${s.last_name}`);
    console.log(`  - Zugeordneter Lehrer: ${tName} (ID: ${s.teacher_id})`);
    console.log(`  - Campus aktiv: ${s.is_campus_active}`);
    console.log(`  - Groovelab aktiv: ${s.is_groovelab_active}`);
    console.log(`  - Status: ${s.status}`);
  });
}
check();
