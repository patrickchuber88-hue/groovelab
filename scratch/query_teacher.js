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

  const sql1 = `
    SELECT id, planned_boards
    FROM public.users
    WHERE id = 'f0963052-ab2f-4434-9e67-7a31da62b184';
  `;

  const sql2 = `
    SELECT id, student_id, day_of_week, time_slot, room_id
    FROM public.schedules
    WHERE teacher_id = 'f0963052-ab2f-4434-9e67-7a31da62b184';
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql1}"`, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql2}"`, (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log('SCHEDULES STDOUT:\n' + data);
        });
      });
    }).on('data', (data) => {
      console.log('TEACHER STDOUT:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
