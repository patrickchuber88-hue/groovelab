const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

console.log('Connecting to Hetzner server...');

conn.on('ready', () => {
  console.log('SSH Connection established.');

  // Create remote directory first
  conn.exec('mkdir -p /root/supabase-project/volumes/functions/ical-feed', (err, stream) => {
    if (err) throw err;
    stream.resume();
    stream.on('close', (code) => {
      if (code !== 0) {
        console.error('Failed to create remote directory, exit code:', code);
        conn.end();
        return;
      }
      console.log('Remote directory created/verified successfully.');

      // Upload index.ts
      conn.sftp((sftpErr, sftp) => {
        if (sftpErr) throw sftpErr;

        const localPath = path.join(__dirname, '..', 'supabase', 'functions', 'ical-feed', 'index.ts');
        const remotePath = '/root/supabase-project/volumes/functions/ical-feed/index.ts';

        console.log(`Uploading ${localPath} to ${remotePath}...`);

        sftp.fastPut(localPath, remotePath, {}, (uploadErr) => {
          if (uploadErr) {
            console.error('Upload failed:', uploadErr);
          } else {
            console.log('SUCCESS: ical-feed/index.ts uploaded successfully!');
          }
          conn.end();
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect(config);
