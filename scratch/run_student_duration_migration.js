const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

const migrationSql = `
-- Add lesson_duration to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lesson_duration INTEGER DEFAULT 45;

-- Add duration to schedules table
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 45;

-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  // Execute psql
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Migration finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    // Write migration SQL to stdin and close stdin
    stream.write(migrationSql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
