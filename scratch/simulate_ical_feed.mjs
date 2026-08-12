import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const userId = 'f7f83cc3-6900-4388-8290-a4d99a9fb383'; // Silas
const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
const role = 'student';

async function run() {
  console.log("=== SIMULATING ICAL FEED LOGIC FOR SILAS ===");
  
  let progPoints = [];
  // For students, fetch approved program points
  const { data, error } = await supabase
    .from('campus_event_program_points')
    .select('*, event:event_id(*)')
    .eq('status', 'approved');
  
  if (error) {
    console.error("Error fetching program points:", error);
    return;
  }
  
  console.log(`Fetched ${data.length} approved program points in total.`);
  
  progPoints = data.filter((pp) => {
    const assigned = pp.additional_feedback_responses?.assigned_students || [];
    const isMatch = assigned.includes(userId);
    return isMatch;
  });
  
  console.log("Filtered progPoints for Silas:", progPoints.map(p => ({ id: p.id, name: p.name })));

  // Query direct events
  const { data: directEvents, error: deErr } = await supabase
    .from('campus_events')
    .select('*, room:room_id(name)')
    .eq('school_id', schoolId);

  let directAssignedEventIds = [];
  if (!deErr && directEvents) {
    const directAssigned = directEvents.filter((ev) => {
      const isAssigned = (ev.assigned_student_ids || []).includes(userId) || ev.student_id === userId;
      return isAssigned;
    });
    directAssignedEventIds = directAssigned.map((ev) => ev.id);
  }
  console.log("Directly assigned events for Silas:", directAssignedEventIds);

  const eventIds = [...new Set(progPoints.map((pp) => pp.event_id))];
  const allEventIds = [...new Set([...eventIds, ...directAssignedEventIds])];
  console.log("All matching Event IDs for Silas's feed:", allEventIds);

  if (allEventIds.length > 0) {
    const { data: eventsData, error: evErr } = await supabase
      .from('campus_events')
      .select('*, room:room_id(name)')
      .in('id', allEventIds);
    
    if (evErr) {
      console.error("Error fetching events:", evErr);
      return;
    }
    console.log("Loaded events:", eventsData.map(e => ({ id: e.id, title: e.title, event_date: e.event_date })));
  } else {
    console.log("No events match.");
  }
}

run();
