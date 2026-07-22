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
  console.log('SSH connection established!');

  const sql = `
    SELECT s.id, s.teacher_id, u.first_name as teacher_first, u.last_name as teacher_last, u.teacher_availability
    FROM public.students s
    LEFT JOIN public.users u ON s.teacher_id = u.id
    WHERE s.id = '497db9d7-0689-4c72-b5d5-ad033ac0eb29';
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => console.log('STDOUT:\n' + d)).on('close', () => conn.end());
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
