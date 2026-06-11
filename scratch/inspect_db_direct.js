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

conn.on('ready', () => {
  console.log('SSH connection established.');

  conn.exec('docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT * FROM public.avatars WHERE user_id = \'f7f83cc3-6900-4388-8290-a4d99a9fb383\'; SELECT * FROM public.student_stats WHERE student_id = \'f7f83cc3-6900-4388-8290-a4d99a9fb383\';"', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.error('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
