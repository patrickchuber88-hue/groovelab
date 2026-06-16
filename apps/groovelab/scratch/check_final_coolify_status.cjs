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

const command = 'curl -I -k -H "Host: coolify.178.105.10.2.sslip.io" https://localhost:443 && echo "" && curl -I -k -H "Host: coolify.178.105.10.2.nip.io" https://localhost:443';

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec(command, (err, stream) => {
    if (err) throw err;
    
    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`Command finished with code ${code}.`);
      console.log('--- OUTPUT ---');
      console.log(output);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
