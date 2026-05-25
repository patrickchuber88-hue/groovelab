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
    // List databases
    'docker exec supabase-db psql -U postgres -d postgres -c "\\l"',
    // List users
    'docker exec supabase-db psql -U postgres -d postgres -c "SELECT email, id FROM auth.users;" || echo "No auth schema/table"',
    // List public tables
    'docker exec supabase-db psql -U postgres -d postgres -c "\\dt public.*"'
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
