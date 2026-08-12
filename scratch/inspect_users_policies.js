import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const tempUserId = '99999999-9999-9999-9999-999999999999';
  const { data: schools } = await supabase.from('schools').select('id').limit(1);
  const schoolId = schools[0].id;

  await supabase.from('users').delete().eq('id', tempUserId);
  await supabase.from('users').insert({
    id: tempUserId,
    school_id: schoolId,
    role: 'student',
    first_name: 'Audit',
    last_name: 'Temp',
    avatar_url: 'init'
  });

  const sql = `
    UPDATE public.users 
    SET avatar_url = (
      SELECT json_agg(t)::text 
      FROM (
        SELECT policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'users'
      ) t
    )
    WHERE id = '${tempUserId}';
  `;
  await supabase.rpc('execute_sql', { sql_query: sql });

  const { data: user } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', tempUserId)
    .single();

  console.log("Policies on users table:");
  console.log(JSON.stringify(JSON.parse(user.avatar_url), null, 2));

  await supabase.from('users').delete().eq('id', tempUserId);
}

run();
