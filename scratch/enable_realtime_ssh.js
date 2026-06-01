const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

const sql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- schedule_occurrences
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'schedule_occurrences'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_occurrences;
      RAISE NOTICE 'Added schedule_occurrences to supabase_realtime publication';
    END IF;

    -- sessions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
      RAISE NOTICE 'Added sessions to supabase_realtime publication';
    END IF;

    -- crisis_notifications
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'crisis_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_notifications;
      RAISE NOTICE 'Added crisis_notifications to supabase_realtime publication';
    END IF;

    -- progress_matrix
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'progress_matrix'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_matrix;
      RAISE NOTICE 'Added progress_matrix to supabase_realtime publication';
    END IF;
  END IF;
END $$;
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('SQL Execution finished with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
