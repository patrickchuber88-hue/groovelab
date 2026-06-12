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

const sqlPath = path.resolve('supabase/migrations/161_master_billing_settings.sql');
console.log('Loading migration SQL from:', sqlPath);
const sqlQuery = fs.readFileSync(sqlPath, 'utf-8');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
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
  console.error('SSH Connection Error:', err);
}).connect(config);
