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
  console.log('SSH connection established.');

  const sql = `
    SELECT id, student_id, teacher_id, day_of_week, time_slot, room_id, duration, status
    FROM public.schedules
    WHERE student_id = '6f95b8bd-6dc6-45b5-aee4-97d2be2af527';
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
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
