const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'Groovelab2026temp',
  readyTimeout: 10000
};

// Read public key to authorize it
const pubKeyPath = path.join(process.env.HOME, '.ssh', 'id_ed25519.pub');
const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  // Commands to run:
  // 1. Authorize SSH public key
  // 2. Start docker service if needed
  // 3. Start Coolify and proxy containers
  // 4. List running containers
  const commands = [
    `mkdir -p ~/.ssh && chmod 700 ~/.ssh`,
    `echo "${pubKey}" >> ~/.ssh/authorized_keys`,
    `chmod 600 ~/.ssh/authorized_keys`,
    `systemctl enable docker && systemctl start docker`,
    `docker start coolify coolify-proxy coolify-db coolify-database || true`,
    `docker ps`
  ];

  const fullCommand = commands.join(' && ');

  console.log('Executing recovery commands on the server...');
  conn.exec(fullCommand, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log(`Command execution finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
