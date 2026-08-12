import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'; // Patrick Huber
  
  const { data: occs, error } = await supabase
    .from('schedule_occurrences')
    .select('*, student:student_id(*), schedules(*)')
    .eq('teacher_id', teacherId)
    .gte('date', '2026-06-22')
    .lte('date', '2026-07-05')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
    
  if (error) console.error(error);
  else {
    console.log("All occurrences in week:");
    console.log(occs.map(o => ({
      id: o.id,
      student_name: `${o.student?.first_name} ${o.student?.last_name}`,
      date: o.date,
      start_time: o.start_time,
      duration: o.duration,
      status: o.status,
      original_date: o.original_date
    })));
  }
}

run();
