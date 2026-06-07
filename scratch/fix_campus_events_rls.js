const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const migrationSql = `
  -- 1. Create helper to get current user ID
  CREATE OR REPLACE FUNCTION public.get_current_user_id()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  AS $$
  DECLARE
      v_headers text;
      v_user_id text;
  BEGIN
      v_headers := current_setting('request.headers', true);
      IF v_headers IS NULL OR v_headers = '' THEN
          RETURN NULL;
      END IF;
      v_user_id := v_headers::json->>'x-user-id';
      IF v_user_id IS NULL OR v_user_id = '' THEN
          RETURN NULL;
      END IF;
      RETURN v_user_id::uuid;
  EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
  END;
  $$;

  -- 2. Drop old campus_events policies
  DROP POLICY IF EXISTS "Allow read access for authenticated users of the same school" ON public.campus_events;
  DROP POLICY IF EXISTS "Allow write access for teachers and admins" ON public.campus_events;
  DROP POLICY IF EXISTS campus_events_select ON public.campus_events;
  DROP POLICY IF EXISTS campus_events_modify ON public.campus_events;

  -- 3. Create new RLS policies for campus_events
  CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
    public.is_master_admin()
    OR (
      public.check_school_access(school_id)
      AND (is_public = true OR created_by = public.get_current_user_id())
    )
  );

  CREATE POLICY campus_events_modify ON public.campus_events FOR ALL USING (
    public.is_master_admin()
    OR (
      public.check_school_access(school_id)
      AND (
        public.is_teacher_or_admin()
        OR created_by = public.get_current_user_id()
      )
    )
  );

  -- 4. Reload schema cache
  NOTIFY pgrst, 'reload schema';
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Migration finished with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(migrationSql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
