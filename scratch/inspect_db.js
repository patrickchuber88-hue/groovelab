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
-- Verify school_user_statistics view columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'school_user_statistics'
ORDER BY ordinal_position;
`;

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`Query finished with code ${code}.`);
      console.log('--- OUTPUT ---');
      console.log(output);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });

    stream.write(sqlQuery);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
