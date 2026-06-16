const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const conn = new Client();

const sqlQuery = process.argv[2] || "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;";
console.log('Running query:', sqlQuery);

conn.on('ready', () => {
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres -c "' + sqlQuery.replace(/"/g, '\\"') + '"', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
}).connect(config);
