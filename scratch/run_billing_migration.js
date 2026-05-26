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
-- 1. Add is_premium_user to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium_user BOOLEAN DEFAULT FALSE;

-- 2. Add billing/quota columns to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS user_quota INTEGER DEFAULT 150;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS pending_user_quota INTEGER DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS quota_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Force schema reload for PostgREST
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
