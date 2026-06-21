import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  console.log("Fetching teachers...");
  const { data: teachers, error: tErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, school_id, role')
    .in('role', ['teacher', 'admin', 'secretary']);

  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }

  console.log(`Found ${teachers.length} teachers/staff members.`);

  console.log("Fetching campus events...");
  const { data: events, error: eErr } = await supabase
    .from('campus_events')
    .select('id, title, school_id');

  if (eErr) {
    console.error("Error fetching campus events:", eErr);
    return;
  }

  console.log(`Found ${events.length} campus events.`);

  const dummyProgramPoints = [
    { name: 'Klassisches Klavierduo', ensemble_band: 'Steinway Keys', duration: 8, performer_count: 2, instrument: 'Klavier', status: 'submitted' },
    { name: 'Rock-Band Live', ensemble_band: 'The Groovelab Rockers', duration: 12, performer_count: 5, instrument: 'E-Gitarre, Schlagzeug', status: 'submitted' },
    { name: 'Vocal Ensemble', ensemble_band: 'Harmonic Voices', duration: 6, performer_count: 3, instrument: 'Gesang', status: 'approved' }
  ];

  let insertedCount = 0;
  for (const event of events) {
    // Filter teachers who belong to this event's school or just insert for all
    const eventTeachers = teachers.filter(t => t.school_id === event.school_id);
    console.log(`Event "${event.title}" has ${eventTeachers.length} eligible teachers.`);

    for (const teacher of eventTeachers) {
      console.log(`Inserting dummies for ${teacher.first_name} ${teacher.last_name} (${teacher.role})...`);
      for (const dummy of dummyProgramPoints) {
        const { data, error } = await supabase
          .from('campus_event_program_points')
          .insert({
            event_id: event.id,
            school_id: event.school_id,
            teacher_id: teacher.id,
            name: `${dummy.name} (${teacher.last_name})`,
            ensemble_band: dummy.ensemble_band,
            performer_count: dummy.performer_count,
            duration: dummy.duration,
            instrument: dummy.instrument,
            status: dummy.status,
            is_pause: false,
            is_scheduled: false
          })
          .select();

        if (error) {
          console.error(`❌ Failed to insert program point for teacher ${teacher.id}:`, error.message);
        } else {
          insertedCount++;
        }
      }
    }
  }

  console.log(`🎉 Finished! Successfully inserted ${insertedCount} dummy program points.`);
}

run();
