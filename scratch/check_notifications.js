import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', 'f7f83cc3-6900-4388-8290-a4d99a9fb383')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching notifications:', error);
  } else {
    console.log('Recent notifications for Silas Meier:', notifications);
  }
}

main();
