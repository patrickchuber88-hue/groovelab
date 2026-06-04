import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function runTest() {
  console.log("Testing anonymous QR queries after RLS patch...");
  
  // 1. We connect as an anonymous client (just like the login screen)
  const supabase = createClient(url, key);

  // Let's fetch one teacher and one student from the DB to get their actual QR tokens
  // We do this using master bypass first
  const masterSupabase = createClient(url, key, {
    global: { headers: { 'x-user-id': '88888888-8888-8888-8888-888888888888' } }
  });
  
  const { data: teacher } = await masterSupabase
    .from('users')
    .select('first_name, teacher_qr_token')
    .eq('role', 'teacher')
    .eq('first_name', 'Patrick')
    .single();

  const { data: student } = await masterSupabase
    .from('users')
    .select('first_name, qr_token')
    .eq('role', 'student')
    .limit(1)
    .single();

  console.log("Teacher for test:", teacher);
  console.log("Student for test:", student);

  if (teacher) {
    // Attempt to query teacher anonymously by sending teacher_qr_token in x-qr-token header
    const anonTeacherSupabase = createClient(url, key, {
      global: { headers: { 'x-qr-token': teacher.teacher_qr_token } }
    });
    
    const { data, error } = await anonTeacherSupabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('teacher_qr_token', teacher.teacher_qr_token)
      .maybeSingle();

    console.log("Anonymous Teacher Query Result:", data, error);
  }

  if (student) {
    // Attempt to query student anonymously by sending qr_token in x-qr-token header
    const anonStudentSupabase = createClient(url, key, {
      global: { headers: { 'x-qr-token': student.qr_token } }
    });
    
    const { data, error } = await anonStudentSupabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('qr_token', student.qr_token)
      .maybeSingle();

    console.log("Anonymous Student Query Result:", data, error);
  }
}

runTest();
