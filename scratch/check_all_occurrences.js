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
    SELECT o.id, o.student_id, o.date, o.start_time, o.status, s.day_of_week, s.time_slot
    FROM public.schedule_occurrences o
    LEFT JOIN public.schedules s ON o.schedule_id = s.id
    WHERE o.teacher_id = 'f0963052-ab2f-4434-9e67-7a31da62b184'
    ORDER BY o.date ASC, o.start_time ASC;
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
