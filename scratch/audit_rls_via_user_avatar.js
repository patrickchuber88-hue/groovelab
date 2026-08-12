import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Starting RLS audit via user avatar_url...");

  const tempUserId = '99999999-9999-9999-9999-999999999999';
  
  // 1. Get an existing school ID first
  const { data: schools, error: schoolErr } = await supabase.from('schools').select('id').limit(1);
  if (schoolErr || !schools || schools.length === 0) {
    console.error("Could not find any schools in the database:", schoolErr);
    return;
  }
  const schoolId = schools[0].id;
  console.log("Using school ID:", schoolId);

  // 2. Delete temp user if they already exist
  await supabase.from('users').delete().eq('id', tempUserId);

  // 3. Insert temp user
  const { error: insertErr } = await supabase.from('users').insert({
    id: tempUserId,
    school_id: schoolId,
    role: 'student',
    first_name: 'Audit',
    last_name: 'Temp',
    avatar_url: 'init'
  });
  if (insertErr) {
    console.error("Failed to insert temp user:", insertErr);
    return;
  }

  // 4. Run SQL to set avatar_url to pg_tables JSON
  const sql = `
    UPDATE public.users 
    SET avatar_url = (
      SELECT json_agg(t)::text 
      FROM (
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      ) t
    )
    WHERE id = '${tempUserId}';
  `;
  const { error: sqlErr } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (sqlErr) {
    console.error("Failed to run SQL update:", sqlErr);
    // Cleanup
    await supabase.from('users').delete().eq('id', tempUserId);
    return;
  }

  // 5. Query user to get the result
  const { data: user, error: queryErr } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', tempUserId)
    .single();

  if (queryErr) {
    console.error("Failed to query user:", queryErr);
  } else {
    console.log("--- RLS Audit Result ---");
    try {
      const parsed = JSON.parse(user.avatar_url);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Raw output (not valid JSON):", user.avatar_url);
    }
  }

  // 6. Cleanup
  await supabase.from('users').delete().eq('id', tempUserId);
}

run();
