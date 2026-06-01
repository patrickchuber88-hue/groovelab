import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Searching for school 'Musikschule Bad Säckingen'...");

  // 1. Fetch schools
  const { data: schools, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name');

  if (schoolErr) {
    console.error("Error fetching schools:", schoolErr);
    return;
  }

  const badSaeckingenSchool = schools?.find(s => 
    s.name.toLowerCase().includes('bad säckingen') || 
    s.name.toLowerCase().includes('bad saeckingen') ||
    s.name.toLowerCase().includes('bad sackingen') ||
    s.name.toLowerCase().includes('musäk')
  );

  if (!badSaeckingenSchool) {
    console.error("Musikschule Bad Säckingen not found in database.");
    console.log("Available schools:", schools);
    return;
  }

  const schoolId = badSaeckingenSchool.id;
  console.log(`Found school: ${badSaeckingenSchool.name} (ID: ${schoolId})`);

  // 2. Fetch all students for this school
  const { data: students, error: studentErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'student');

  if (studentErr) {
    console.error("Error fetching students:", studentErr);
    return;
  }

  if (!students || students.length === 0) {
    console.log("No students found for this school.");
    return;
  }

  console.log(`Found ${students.length} students. Starting cleanup of data...`);

  const studentIds = students.map(s => s.id);

  // 3. Delete dependent records
  console.log("Deleting student sessions...");
  await supabase.from('sessions').delete().in('user_id', studentIds);

  console.log("Deleting student progress...");
  await supabase.from('user_progress').delete().in('user_id', studentIds);

  console.log("Deleting student song skills...");
  await supabase.from('user_song_skills').delete().in('user_id', studentIds);

  console.log("Deleting student rejection histories...");
  await supabase.from('rejection_history').delete().in('user_id', studentIds);

  console.log("Deleting student DPA agreements...");
  await supabase.from('dpa_agreements').delete().in('user_id', studentIds);

  console.log("Deleting student avatars...");
  await supabase.from('avatars').delete().in('user_id', studentIds);

  console.log("Deleting student schedules...");
  await supabase.from('schedules').delete().in('student_id', studentIds);

  console.log("Deleting student schedule occurrences...");
  await supabase.from('schedule_occurrences').delete().in('student_id', studentIds);

  // 4. Finally delete the students themselves
  console.log("Deleting student users...");
  const { error: deleteErr } = await supabase
    .from('users')
    .delete()
    .in('id', studentIds);

  if (deleteErr) {
    console.error("Error deleting students:", deleteErr);
  } else {
    console.log(`Successfully deleted all ${students.length} students and their corresponding data.`);
    students.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name} (${s.email})`);
    });
  }
}

run();
