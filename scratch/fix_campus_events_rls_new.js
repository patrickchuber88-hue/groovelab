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
  -- Recreate the SELECT policy for campus_events to allow users of the same school
  -- to read events with school-wide visibility configs, enabling correct client-side iCal filtering.
  DROP POLICY IF EXISTS campus_events_select ON public.campus_events;

  CREATE POLICY campus_events_select ON public.campus_events FOR SELECT USING (
    public.is_master_admin()
    OR (
      public.check_school_access(school_id)
      AND (
        is_public = true 
        OR created_by = public.get_current_user_id()
        OR visibility IN ('all', 'teachers', 'students')
      )
    )
  );

  -- Reload schema cache
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
