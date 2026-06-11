import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function main() {
  console.log("Cleaning up simulated test records for Silas...");
  
  // 1. Delete fokus_logs from today
  const { data: delLogs, error: delError } = await supabase
    .from('fokus_logs')
    .delete()
    .eq('user_id', SILAS_ID)
    .gt('created_at', '2026-06-11T00:00:00Z');
  console.log("Deleted logs:", delError ? delError : "Success");

  // 2. Revert student_stats
  const { data: revStats, error: statsError } = await supabase
    .from('student_stats')
    .update({
      total_focus_minutes: 3,
      monthly_focus_minutes: 3,
      streak_flame: 0,
      last_practice_date: '2026-06-04',
      current_xp: 30,
      updated_at: '2026-06-04T20:38:51.554+00:00'
    })
    .eq('student_id', SILAS_ID);
  console.log("Reverted student_stats:", statsError ? statsError : "Success");

  // 3. Revert avatars
  const { data: revAvatar, error: avatarError } = await supabase
    .from('avatars')
    .update({
      xp: 30,
      streak_flame: 0,
      last_focus_date: '2026-06-04'
    })
    .eq('user_id', SILAS_ID);
  console.log("Reverted avatars:", avatarError ? avatarError : "Success");
}

main();
