import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Inserting practice log for Elisabeth...');
  const studentId = '497db9d7-0689-4c72-b5d5-ad033ac0eb29';
  const todayStr = '2026-07-22';
  const startOfDay = new Date('2026-07-22T00:00:00.000Z');
  const endOfDay = new Date('2026-07-22T23:59:59.999Z');

  // Clear existing logs for today
  await supabase
    .from('fokus_logs')
    .delete()
    .eq('user_id', studentId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  // Insert 3-minute Focus Log (duration_seconds: 180 or 0 depending on trigger)
  const { data: fLog, error: fErr } = await supabase
    .from('fokus_logs')
    .insert({
      user_id: studentId,
      duration_minutes: 3,
      duration_seconds: 180,
      is_extra: false,
      flame_level: 'Kleine Flamme',
      created_at: new Date('2026-07-22T14:30:00.000Z').toISOString()
    })
    .select();

  if (fErr) {
    console.log('Trying with duration_seconds: 0...');
    const { data: fLog2, error: fErr2 } = await supabase
      .from('fokus_logs')
      .insert({
        user_id: studentId,
        duration_minutes: 3,
        duration_seconds: 0,
        is_extra: false,
        flame_level: 'Kleine Flamme',
        created_at: new Date('2026-07-22T14:30:00.000Z').toISOString()
      })
      .select();
    
    if (fLog2 && fLog2.length > 0) {
      await supabase.from('fokus_logs').update({ duration_seconds: 180 }).eq('id', fLog2[0].id);
    }
    console.log('Focus Log Result:', fLog2, 'Error:', fErr2);
  } else {
    console.log('Focus Log Result:', fLog);
  }

  // Insert 1:10 Extra Log
  const { data: eLog, error: eErr } = await supabase
    .from('fokus_logs')
    .insert({
      user_id: studentId,
      duration_minutes: 1,
      duration_seconds: 0,
      is_extra: true,
      flame_level: 'Kleine Flamme',
      created_at: new Date('2026-07-22T14:34:00.000Z').toISOString()
    })
    .select();

  if (eLog && eLog.length > 0) {
    await supabase.from('fokus_logs').update({ duration_seconds: 70 }).eq('id', eLog[0].id);
  }
  console.log('Extra Log Result:', eLog, 'Error:', eErr);

  // Update student_stats
  const { data: stats } = await supabase
    .from('student_stats')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  const newStreak = Math.max(1, (stats?.streak_flame || 0) + 1);

  await supabase
    .from('student_stats')
    .upsert({
      student_id: studentId,
      total_focus_minutes: (stats?.total_focus_minutes || 0) + 4,
      monthly_focus_minutes: (stats?.monthly_focus_minutes || 0) + 4,
      streak_flame: newStreak,
      last_practice_date: todayStr,
      current_xp: (stats?.current_xp || 0) + 4,
      updated_at: new Date().toISOString()
    });

  // Update avatar
  const { data: avatar } = await supabase
    .from('avatars')
    .select('*')
    .eq('user_id', studentId)
    .maybeSingle();

  if (avatar) {
    await supabase
      .from('avatars')
      .update({
        streak_flame: newStreak,
        last_focus_date: todayStr,
        xp: (avatar.xp || 0) + 4
      })
      .eq('id', avatar.id);
  }

  console.log('FINISHED! Logged 4:10 practice session for Elisabeth in Supabase!');
}

run();
