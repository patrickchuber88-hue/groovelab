const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  const commands = [
    // Update base_directory for Groovelab (id = 2) to /apps/groovelab
    'docker exec coolify-db psql -U coolify -d coolify -c "UPDATE applications SET base_directory = \'/apps/groovelab\' WHERE id = 2;"',
    // Verify the change
    'docker exec coolify-db psql -U coolify -d coolify -c "SELECT id, name, base_directory FROM applications WHERE id = 2;"'
  ];

  const fullCommand = commands.join(' && echo "---NEXT---" && ');

  conn.exec(fullCommand, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log(`Finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
