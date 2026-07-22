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
    SELECT u.id, u.first_name, u.last_name, u.instrument, u.birth_date, s.status, sfn.first_name as sfn_name, sln.last_name as sln_name, ad.day_of_birth
    FROM public.users u
    LEFT JOIN public.students s ON s.id = u.id
    LEFT JOIN public.student_first_names sfn ON sfn.student_id = u.id
    LEFT JOIN public.student_last_names sln ON sln.student_id = u.id
    LEFT JOIN public.activation_days ad ON ad.student_id = u.id
    WHERE u.id = '497db9d7-0689-4c72-b5d5-ad033ac0eb29';
  `;

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
