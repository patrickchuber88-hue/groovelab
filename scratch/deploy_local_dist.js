const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

console.log('Connecting to Hetzner server...');

conn.on('ready', () => {
  console.log('SSH Connection established.');

  // 1. Upload the local dist.tar.gz file using SFTP
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const localPath = path.join(__dirname, '..', 'dist.tar.gz');
    const remotePath = '/tmp/dist.tar.gz';

    console.log(`Uploading ${localPath} to ${remotePath}...`);

    sftp.fastPut(localPath, remotePath, {}, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload failed:', uploadErr);
        conn.end();
        return;
      }
      console.log('Upload successful! Finding the active container on the server...');

      // 2. Run remote commands to locate the active docker container and copy/extract
      const findContainerCmd = 'docker ps --format "{{.Names}}" | grep vghe0pvamf85tn3pcu2o47db-';
      
      conn.exec(findContainerCmd, (execErr, stream) => {
        if (execErr) throw execErr;

        let containerName = '';
        stream.on('data', (data) => {
          containerName += data.toString().trim();
        }).on('close', () => {
          if (!containerName) {
            console.error('Error: Active container with UUID vghe0pvamf85tn3pcu2o47db not found.');
            conn.end();
            return;
          }

          console.log(`Found active container: ${containerName}`);

          const deployCommands = [
            `docker cp /tmp/dist.tar.gz ${containerName}:/app/`,
            `docker exec ${containerName} bash -c "rm -rf /app/dist/*"`,
            `docker exec ${containerName} bash -c "tar -xzf /app/dist.tar.gz -C /app/dist/"`,
            `docker exec ${containerName} rm /app/dist.tar.gz`,
            'rm /tmp/dist.tar.gz'
          ].join(' && ');

          console.log('Executing deployment and extraction commands inside container...');

          conn.exec(deployCommands, (deployErr, deployStream) => {
            if (deployErr) throw deployErr;

            deployStream.on('data', (d) => {
              console.log('STDOUT: ' + d.toString());
            }).stderr.on('data', (d) => {
              console.error('STDERR: ' + d.toString());
            }).on('close', (code) => {
              if (code === 0) {
                console.log('SUCCESS: Static website synced and updated successfully in the running container!');
              } else {
                console.error(`ERROR: Deployment extraction failed with exit code ${code}`);
              }
              conn.end();
            });
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect(config);
