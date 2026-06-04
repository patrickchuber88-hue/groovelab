import { createClient } from '@supabase/supabase-js'

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

const studentId = "02b976e8-0893-443b-a41a-5e7010fd05f3";

console.log("Querying schedules with teacher relationship...");
const { data, error } = await supabase
  .from('schedules')
  .select(`
    id,
    time_slot,
    status,
    teacher_id,
    rooms (name),
    teacher:users!schedules_teacher_id_fkey (first_name, last_name)
  `)
  .eq('student_id', studentId)
  .maybeSingle();

console.log("Error:", error);
console.log("Data:", data);
