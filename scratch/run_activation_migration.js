const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const sqlQuery = `
  ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS student_billing_option VARCHAR(20) DEFAULT 'option1';
  NOTIFY pgrst, 'reload schema';
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established via private key.');
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`Query finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
    stream.write(sqlQuery);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect(config);
