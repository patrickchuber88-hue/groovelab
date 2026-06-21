import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  console.log("Cleaning up previous dummy submissions...");
  
  // Delete previously inserted dummies by name pattern
  const dummyNames = ['Klassisches Klavierduo', 'Rock-Band Live', 'Vocal Ensemble'];
  for (const name of dummyNames) {
    const { error: delErr } = await supabase
      .from('campus_event_program_points')
      .delete()
      .like('name', `${name}%`);
    if (delErr) {
      console.warn("Error deleting old dummy:", name, delErr);
    }
  }

  console.log("Fetching teachers...");
  const { data: teachers, error: tErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, school_id, role, instrument')
    .in('role', ['teacher', 'admin', 'secretary']);

  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }

  console.log("Fetching campus events...");
  const { data: events, error: eErr } = await supabase
    .from('campus_events')
    .select('id, title, school_id');

  if (eErr) {
    console.error("Error fetching campus events:", eErr);
    return;
  }

  let insertedCount = 0;

  for (const event of events) {
    const eventTeachers = teachers.filter(t => t.school_id === event.school_id);
    console.log(`Processing event "${event.title}"...`);

    for (const teacher of eventTeachers) {
      // Determine the matching instrument
      let rawInstrument = teacher.instrument || 'None';
      let cleanInstrument = 'Gesang'; // default fallback

      if (rawInstrument && rawInstrument !== 'None' && rawInstrument !== 'Nicht festgelegt') {
        // Take the first instrument in a comma-separated list
        cleanInstrument = rawInstrument.split(',')[0].trim();
      } else {
        // Assign a default based on name/role to make it look realistic
        if (teacher.role === 'secretary') {
          cleanInstrument = 'Gesang';
        } else if (teacher.role === 'admin') {
          cleanInstrument = 'Klavier';
        } else {
          cleanInstrument = 'Gitarre';
        }
      }

      console.log(`Teacher: ${teacher.first_name} ${teacher.last_name} (${teacher.role}) -> Instrument: "${cleanInstrument}"`);

      // Define 3 personalized dummy points based on their instrument
      const personalizedDummies = [
        {
          name: `${cleanInstrument}-Solo`,
          ensemble_band: `${teacher.last_name} Soloists`,
          duration: 5,
          performer_count: 1,
          status: 'submitted'
        },
        {
          name: `${cleanInstrument}-Ensemble`,
          ensemble_band: `Groovelab ${cleanInstrument}s`,
          duration: 8,
          performer_count: 4,
          status: 'submitted'
        },
        {
          name: `${cleanInstrument}-Duo`,
          ensemble_band: `Duo ${teacher.last_name}`,
          duration: 10,
          performer_count: 2,
          status: 'approved'
        }
      ];

      for (const dummy of personalizedDummies) {
        const { error } = await supabase
          .from('campus_event_program_points')
          .insert({
            event_id: event.id,
            school_id: event.school_id,
            teacher_id: teacher.id,
            name: `${dummy.name} (${teacher.last_name})`,
            ensemble_band: dummy.ensemble_band,
            performer_count: dummy.performer_count,
            duration: dummy.duration,
            instrument: cleanInstrument,
            status: dummy.status,
            is_pause: false,
            is_scheduled: false
          });

        if (error) {
          console.error(`❌ Failed to insert for ${teacher.last_name}:`, error.message);
        } else {
          insertedCount++;
        }
      }
    }
  }

  console.log(`🎉 Finished! Successfully inserted ${insertedCount} personalized dummy program points.`);
}

run();
