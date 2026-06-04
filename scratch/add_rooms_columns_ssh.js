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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "groovelab_räume" JSONB DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "campus_räume" JSONB DEFAULT '[]';

-- Sync existing planned_boards to groovelab_räume as initial migration
UPDATE public.users 
SET "groovelab_räume" = planned_boards 
WHERE planned_boards IS NOT NULL AND ("groovelab_räume" IS NULL OR "groovelab_räume" = '[]'::jsonb);

NOTIFY pgrst, 'reload schema';
`;

console.log('Connecting via SSH to update database columns...');

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Update script finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    // Write SQL to stdin and close stdin
    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
