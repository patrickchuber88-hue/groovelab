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
  const sql = `
    SELECT id, first_name, last_name, master_admin_username, master_admin_password, is_master_admin 
    FROM public.users 
    WHERE is_master_admin = true;
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log(String(data)));
  });
}).connect(config);
