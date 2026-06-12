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
  conn.exec("docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'users';\"", (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log(data.toString()))
          .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect(config);
