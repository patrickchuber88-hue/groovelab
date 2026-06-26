import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Fetching schedule_occurrences for the week...');
  
  const { data: occurrences, error } = await supabase
    .from('schedule_occurrences')
    .select(`
      id,
      student_id,
      teacher_id,
      date,
      start_time,
      duration,
      status
    `)
    .gte('date', '2026-06-22')
    .lte('date', '2026-06-28');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Let's fetch all users to do local mapping because anon key cannot join users in this schema setup without profile access
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name');
  
  const userMap = {};
  users?.forEach(u => {
    userMap[u.id] = `${u.first_name} ${u.last_name}`;
  });

  console.log('Occurrences Count:', occurrences.length);
  const mapped = occurrences.map(o => ({
    ...o,
    student_name: userMap[o.student_id] || 'Unknown (' + o.student_id + ')',
    teacher_name: userMap[o.teacher_id] || 'Unknown (' + o.teacher_id + ')'
  }));

  console.log('Mapped Occurrences:', JSON.stringify(mapped, null, 2));
}

main();
