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
  ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
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
