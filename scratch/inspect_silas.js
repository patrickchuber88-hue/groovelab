import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function main() {
  console.log("=== CHECKING USER RECORD ===");
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', SILAS_ID)
    .single();
  console.log("User:", userError ? userError : user);

  console.log("\n=== CHECKING AVATAR / STATS ===");
  const { data: avatars, error: avatarError } = await supabase
    .from('avatars')
    .select('*')
    .eq('user_id', SILAS_ID);
  console.log("Avatars:", avatarError ? avatarError : avatars);

  const { data: stats, error: statsError } = await supabase
    .from('student_stats')
    .select('*')
    .eq('student_id', SILAS_ID);
  console.log("Student Stats:", statsError ? statsError : stats);

  console.log("\n=== CHECKING FOKUS LOGS ===");
  const { data: logs, error: logsError } = await supabase
    .from('fokus_logs')
    .select('*')
    .eq('user_id', SILAS_ID)
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("Fokus Logs (last 10):", logsError ? logsError : logs);
}

main();
