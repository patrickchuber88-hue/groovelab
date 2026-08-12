import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('users')
    .update({ is_premium_user: true })
    .eq('id', 'f7f83cc3-6900-4388-8290-a4d99a9fb383')
    .select();

  if (error) {
    console.error('Error updating Silas:', error);
  } else {
    console.log('Successfully updated Silas to premium:', data);
  }
}

main();
