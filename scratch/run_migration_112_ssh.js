const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

const migrationSqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '112_add_user_is_pin_activated.sql');
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

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
