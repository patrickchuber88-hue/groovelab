const { createClient } = require('@supabase/supabase-js');
const url = 'https://supabase.campus-groovelab.de';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, is_campus_active');
  const { data: pendingStuds } = await supabase.from('students').select('id, first_name, last_name, teacher_id');
  
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');
  const activeStudents = users.filter(u => u.role === 'student');
  
  console.log('=== AKTIVE SCHÜLER (users Table) ===');
  activeStudents.forEach(s => {
    const t = teachers.find(teach => teach.id === s.teacher_id);
    const tName = t ? `${t.first_name} ${t.last_name} (${t.role})` : 'Keine Zuweisung (null)';
    console.log(`- ${s.first_name} ${s.last_name}: ${tName} [Campus: ${s.is_campus_active}]`);
  });

  console.log('\n=== AUSSTEHENDE SCHÜLER (students Table) ===');
  (pendingStuds || []).forEach(s => {
    const t = teachers.find(teach => teach.id === s.teacher_id);
    const tName = t ? `${t.first_name} ${t.last_name} (${t.role})` : 'Keine Zuweisung (null)';
    console.log(`- ${s.first_name} ${s.last_name}: ${tName}`);
  });
}
check();
