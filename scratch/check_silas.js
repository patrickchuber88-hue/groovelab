import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  // Query Silas
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_premium_user, push_notifications_enabled')
    .ilike('first_name', '%Silas%');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('--- Users Matching Silas ---');
  console.log(users);

  for (const user of users) {
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subError) {
      console.error(`Error fetching subscriptions for ${user.first_name}:`, subError);
    } else {
      console.log(`Push subscriptions for ${user.first_name} (${user.id}):`, subs);
    }
  }
}

main();
