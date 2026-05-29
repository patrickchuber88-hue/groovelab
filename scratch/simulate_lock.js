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

  const query = `
    SELECT id, planned_boards
    FROM public.users
    WHERE id = 'f0963052-ab2f-4434-9e67-7a31da62b184';
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${query}"`, (err, stream) => {
    if (err) throw err;
    
    let buffer = '';
    stream.on('close', (code, signal) => {
      conn.end();
      
      // Parse stdout to get the planned_boards JSON string
      const lines = buffer.split('\n');
      const dataLine = lines.find(line => line.includes('f0963052-ab2f-4434-9e67-7a31da62b184'));
      if (!dataLine) {
        console.error('Teacher profile not found in stdout');
        return;
      }
      
      const jsonStart = dataLine.indexOf('[');
      const jsonEnd = dataLine.lastIndexOf(']') + 1;
      const jsonStr = dataLine.substring(jsonStart, jsonEnd);
      
      try {
        const plannedBoards = JSON.parse(jsonStr);
        console.log('\n--- SIMULATED SCHEDULE INSERTS FROM PLANNED BOARDS ---');
        const inserts = [];
        plannedBoards.forEach(board => {
          if (!board.students) return;
          board.students.forEach(s => {
            inserts.push({
              student_id: s.isBreak ? null : s.id,
              student_name: `${s.first_name} ${s.last_name}`,
              day_of_week: board.dayOfWeek,
              time_slot: s.assignedTime,
              duration: s.duration
            });
          });
        });
        console.log(JSON.stringify(inserts, null, 2));
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        console.log('Raw JSON String was:', jsonStr);
      }
    }).on('data', (data) => {
      buffer += data;
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
