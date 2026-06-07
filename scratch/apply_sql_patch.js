import { Client } from 'ssh2';
import fs from 'fs';

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const conn = new Client();

const query = `
SELECT id, role, first_name, last_name, email, status FROM public.users WHERE id = '873778c7-71f1-45dd-a718-ebbaf9374734';
`;

conn.on('ready', () => {
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(query);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
