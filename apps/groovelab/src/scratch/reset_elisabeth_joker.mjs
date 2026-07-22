import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const studentId = '497db9d7-0689-4c72-b5d5-ad033ac0eb29';

  console.log('Resetting invalid joker_used_at for Elisabeth...');

  // Reset user's joker_used_at to null
  const { error: uErr } = await supabase
    .from('users')
    .update({ joker_used_at: null })
    .eq('id', studentId);

  console.log('User reset error:', uErr);

  // Set streak_flame to 1 (today 22.07.26 is active)
  const { error: sErr } = await supabase
    .from('student_stats')
    .update({ streak_flame: 1, last_practice_date: '2026-07-22' })
    .eq('student_id', studentId);

  console.log('student_stats reset error:', sErr);

  const { error: aErr } = await supabase
    .from('avatars')
    .update({ streak_flame: 1, last_focus_date: '2026-07-22' })
    .eq('user_id', studentId);

  console.log('avatar reset error:', aErr);

  console.log('SUCCESS! Reset Elisabeth joker_used_at to null and streak to 1!');
}

run();
