import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Fetching all approved/ready schedules...");
  const { data: schedules, error: fetchErr } = await supabase
    .from('schedules')
    .select('*')
    .in('status', ['approved', 'ready_for_admin_review', 'draft', 'pending_parent_approval']);

  if (fetchErr || !schedules) {
    console.error("Failed to fetch schedules:", fetchErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules.`);

  const occurrences = [];
  const today = new Date();

  schedules.forEach(schedule => {
    const { id: scheduleId, student_id, teacher_id, day_of_week, time_slot, duration } = schedule;
    if (!day_of_week || !time_slot) return;

    for (let i = 0; i < 4; i++) {
      const targetDate = new Date();
      const currentDay = today.getDay() || 7; // 1 = Monday, 7 = Sunday
      const diff = day_of_week - currentDay + (i * 7);
      targetDate.setDate(today.getDate() + diff);

      const dateStr = targetDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      if (dateStr < todayStr) continue;

      occurrences.push({
        schedule_id: scheduleId,
        student_id,
        teacher_id,
        date: dateStr,
        start_time: time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot,
        duration: duration || 45,
        status: 'scheduled'
      });
    }
  });

  if (occurrences.length > 0) {
    console.log(`Deleting future occurrences...`);
    const todayStr = today.toISOString().split('T')[0];
    await supabase
      .from('schedule_occurrences')
      .delete()
      .gte('date', todayStr);

    console.log(`Inserting ${occurrences.length} occurrences...`);
    const { error: insertErr } = await supabase
      .from('schedule_occurrences')
      .insert(occurrences);

    if (insertErr) {
      console.error("Failed to insert schedule occurrences:", insertErr);
    } else {
      console.log("Successfully populated all schedule occurrences!");
    }
  }
}

run();
