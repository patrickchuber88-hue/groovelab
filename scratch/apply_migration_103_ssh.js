const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const sqlPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/103_display_down_focus_sessions.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

conn.on('ready', () => {
  console.log('SSH connection established. Applying Migration 103...');
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Command closed with code ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log('PSQL OUTPUT: ' + data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
