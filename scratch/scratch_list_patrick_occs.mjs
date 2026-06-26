import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, SERVICE_KEY);

async function main() {
  console.log('Fetching ALL occurrences on 2026-06-29 across all teachers/rooms...');
  
  const { data: occs, error: oErr } = await supabase
    .from('schedule_occurrences')
    .select(`
      *,
      schedules (
        room_id,
        room:rooms (id, name)
      )
    `)
    .eq('date', '2026-06-29')
    .order('start_time');
      
  if (oErr) {
    console.error('Error:', oErr);
    return;
  }
  
  const studentIds = occs.map(o => o.student_id).filter(Boolean);
  const teacherIds = occs.map(o => o.teacher_id).filter(Boolean);
  const userIds = [...new Set([...studentIds, ...teacherIds])];
  
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);
      
  const userMap = {};
  users?.forEach(u => {
    userMap[u.id] = `${u.first_name} ${u.last_name}`;
  });
  
  const mapped = occs.map(o => ({
    id: o.id,
    student_name: userMap[o.student_id] || 'Unknown',
    teacher_name: userMap[o.teacher_id] || 'Unknown',
    date: o.date,
    start_time: o.start_time,
    duration: o.duration,
    status: o.status,
    room_name: o.schedules?.room?.name || 'No Room',
    room_id: o.schedules?.room_id || null
  }));
  
  console.log('All Occurrences on 2026-06-29:', JSON.stringify(mapped, null, 2));
}

main();
