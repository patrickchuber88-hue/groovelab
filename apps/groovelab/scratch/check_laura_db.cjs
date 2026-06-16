const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const conn = new Client();

const sqlQuery = `
-- Get names of users with UNREAD crisis notifications who are named Laura
SELECT id, role, first_name, last_name FROM users WHERE id IN (SELECT student_id FROM crisis_notifications WHERE status = 'UNREAD') AND first_name ILIKE '%Laura%';

-- Get all crisis notifications for any Laura
SELECT * FROM crisis_notifications WHERE student_id IN (SELECT id FROM users WHERE first_name ILIKE '%Laura%');
`;

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
