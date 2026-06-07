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

conn.on('ready', () => {
  console.log('SSH connection established. Running migration 127 via stdin...');
  const sql = fs.readFileSync('supabase/migrations/127_campus_events_color_and_visibility.sql', 'utf-8');
  
  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres`, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Migration stream closed with code:', code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data.toString());
    }).stderr.on('data', (data) => {
      console.error('STDERR:\n' + data.toString());
    });
    
    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect(config);
