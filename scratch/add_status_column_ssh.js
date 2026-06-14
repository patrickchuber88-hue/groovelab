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

const sql = `
ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
NOTIFY pgrst, 'reload schema';
`;

console.log('Connecting via SSH to update database columns...');
conn.on('ready', () => {
  console.log('SSH connection established successfully.');
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`Update script finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => console.log('STDOUT: ' + data))
      .stderr.on('data', (data) => console.log('STDERR: ' + data));

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => console.error('SSH Error:', err)).connect(config);
