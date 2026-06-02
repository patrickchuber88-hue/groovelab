import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function simulate() {
  const schoolId = '85e05c87-8742-4f76-bc30-ea5f83bb519e'; // Let's check schoolId.
  // Wait, let's fetch school first
  const { data: schools } = await supabase.from('schools').select('*');
  const school = schools[0];
  console.log("School:", school.name, "ID:", school.id);
  
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', school.id);
    
  console.log("Total users fetched:", allUsers.length);
  const students = allUsers.filter(u => u.role === 'student');
  console.log("Total students fetched:", students.length);
  
  const isBadSaeckingen = school.name.toLowerCase().includes('bad säckingen') || 
                          school.name.toLowerCase().includes('bad saeckingen') || 
                          school.name.toLowerCase().includes('bad sackingen') || 
                          school.name.toLowerCase().includes('musäk');
                          
  const campusStudentsOnly = students.filter((s) => {
    return s.is_campus_active && isBadSaeckingen;
  });
  console.log("campusStudentsOnly count:", campusStudentsOnly.length);
  
  // Find Boris Stoll
  const boris = allUsers.find(u => u.role === 'teacher' && u.last_name.includes('Stoll'));
  console.log("Boris Stoll ID:", boris.id);
  
  const filteredStudents = campusStudentsOnly.filter((s) => {
    const matchesTeacher = s.teacher_id === boris.id;
    return matchesTeacher;
  });
  
  console.log("Students matching Boris Stoll:", filteredStudents.length);
  filteredStudents.forEach(s => {
    console.log(`- ${s.first_name} ${s.last_name} (${s.instrument}) teacher_id: ${s.teacher_id} is_campus_active: ${s.is_campus_active}`);
  });
}

simulate();
