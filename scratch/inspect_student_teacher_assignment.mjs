import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectAssignments() {
  // Fetch all teachers
  const { data: teachers, error: tErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('role', 'teacher');
    
  if (tErr) {
    console.error("Teachers error:", tErr);
    return;
  }
  
  console.log("Teachers in DB:");
  teachers.forEach(t => {
    console.log(`- ${t.first_name} ${t.last_name} (ID: ${t.id})`);
  });

  // Fetch all students and their teacher_id
  const { data: students, error: sErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, teacher_id, is_campus_active')
    .eq('role', 'student');
    
  if (sErr) {
    console.error("Students error:", sErr);
    return;
  }
  
  console.log(`\nTotal students: ${students.length}`);
  const activeStudents = students.filter(s => s.is_campus_active);
  console.log(`Active campus students: ${activeStudents.length}`);
  
  // Count by teacher_id
  const countByTeacher = {};
  activeStudents.forEach(s => {
    countByTeacher[s.teacher_id] = (countByTeacher[s.teacher_id] || 0) + 1;
  });
  
  console.log("\nActive Students count by teacher_id in DB:");
  Object.entries(countByTeacher).forEach(([tId, count]) => {
    const t = teachers.find(x => x.id === tId);
    const name = t ? `${t.first_name} ${t.last_name}` : "null/unknown";
    console.log(`- Teacher ${name} (ID: ${tId}): ${count} students`);
  });

  // Print all students assigned to Boris Stoll specifically
  const boris = teachers.find(t => t.last_name.includes('Stoll'));
  if (boris) {
    const { data: borisStudents, error: bsErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, instrument')
      .eq('teacher_id', boris.id)
      .eq('is_campus_active', true);
      
    if (bsErr) {
      console.error(bsErr);
      return;
    }
    
    console.log(`\nActive Students assigned to Boris Stoll (${borisStudents.length}):`);
    borisStudents.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name} (${s.instrument || 'none'}) (ID: ${s.id})`);
    });
  }
}

inspectAssignments();
