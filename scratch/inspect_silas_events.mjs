import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function run() {
  console.log("=== Checking events with 'Musikschulfest' ===");
  const { data: events, error: evErr } = await supabase
    .from('campus_events')
    .select('*')
    .ilike('title', '%Musikschulfest%');
  
  if (evErr) {
    console.error("Error fetching events:", evErr);
    return;
  }
  console.log("Events found:", events);

  if (events && events.length > 0) {
    const eventIds = events.map(e => e.id);
    console.log("=== Checking program points for these events ===");
    const { data: pps, error: ppsErr } = await supabase
      .from('campus_event_program_points')
      .select('*')
      .in('event_id', eventIds);
    
    if (ppsErr) {
      console.error("Error fetching program points:", ppsErr);
      return;
    }
    console.log("Program points found:", pps.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      assigned_students: p.additional_feedback_responses?.assigned_students,
      student_id: p.student_id
    })));

    // Let's check if Silas is assigned to any of them
    const silasPps = pps.filter(p => {
      const assigned = p.additional_feedback_responses?.assigned_students || [];
      return assigned.includes(SILAS_ID) || p.student_id === SILAS_ID;
    });
    console.log("Silas assigned program points:", silasPps);
  }
}

run();
