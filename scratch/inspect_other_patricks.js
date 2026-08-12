const { createClient } = require('@supabase/supabase-js');
const url = 'https://supabase.campus-groovelab.de';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function check() {
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, is_campus_active');
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');
  const students = users.filter(u => u.role === 'student');
  
  console.log('Schülerzuordnungen für andere Patrick Huber Accounts:');
  const otherPatricks = ['13e8fac6-8e6c-47e2-93b3-f2f9888a5626', '11079eae-664a-49a4-8692-771d83a3193c'];
  
  students.forEach(s => {
    if (otherPatricks.includes(s.teacher_id)) {
      const t = teachers.find(teach => teach.id === s.teacher_id);
      console.log(`- ${s.first_name} ${s.last_name}: teacher_id=${s.teacher_id} (${t ? t.first_name + ' ' + t.last_name + ' / ' + t.role : 'Unbekannt'})`);
    }
  });
}
check();
