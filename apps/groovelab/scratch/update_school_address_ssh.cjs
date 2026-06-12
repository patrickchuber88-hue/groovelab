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
  console.log('SSH connection established successfully.');
  
  const sql = `
    UPDATE public.schools 
    SET street = 'Friedrichstraße 33', 
        zip_code = '79713', 
        city = 'Bad Säckingen' 
    WHERE id = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  `;
  
  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Finished with exit code:', code);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect(config);
