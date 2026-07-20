const { createClient } = require('@supabase/supabase-js');
const url = 'https://supabase.campus-groovelab.de';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(url, key);

async function check() {
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, is_campus_active');
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');
  const students = users.filter(u => u.role === 'student');
  
  console.log('Schüler mit ihren genauen teacher_ids:');
  students.forEach(s => {
    const t = teachers.find(teach => teach.id === s.teacher_id);
    if (s.teacher_id) {
      console.log(`- ${s.first_name} ${s.last_name}: teacher_id=${s.teacher_id} (${t ? t.first_name + ' ' + t.last_name + ' / ' + t.role : 'Unbekannt'})`);
    }
  });
}
check();
