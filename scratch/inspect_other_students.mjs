import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectOtherStudents() {
  const { data: students, error } = await supabase
    .from('users')
    .select('first_name, last_name, teacher_id, instrument')
    .eq('role', 'student')
    .in('first_name', ['Amelie', 'Anton', 'Aurora', 'Ben', 'Clara']);
    
  if (error) {
    console.error(error);
    return;
  }
  
  // Fetch teachers
  const { data: teachers } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'teacher');
    
  students.forEach(s => {
    const t = teachers.find(x => x.id === s.teacher_id);
    const tName = t ? `${t.first_name} ${t.last_name}` : 'null';
    console.log(`Student: ${s.first_name} ${s.last_name} (${s.instrument}) -> Teacher: ${tName}`);
  });
}

inspectOtherStudents();
