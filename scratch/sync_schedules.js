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

  // Fetch the teacher's planned boards
  const fetchSql = `
    SELECT id, school_id, planned_boards
    FROM public.users
    WHERE id = 'f0963052-ab2f-4434-9e67-7a31da62b184';
  `;

  conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${fetchSql}"`, (err, stream) => {
    if (err) throw err;
    
    let buffer = '';
    stream.on('close', (code, signal) => {
      // Parse stdout
      const lines = buffer.split('\n');
      const dataLine = lines.find(line => line.includes('f0963052-ab2f-4434-9e67-7a31da62b184'));
      if (!dataLine) {
        console.error('Teacher profile not found');
        conn.end();
        return;
      }
      
      const parts = dataLine.split('|');
      const schoolId = parts[1].trim();
      const jsonStart = dataLine.indexOf('[');
      const jsonEnd = dataLine.lastIndexOf(']') + 1;
      const jsonStr = dataLine.substring(jsonStart, jsonEnd);
      
      try {
        const plannedBoards = JSON.parse(jsonStr);
        console.log('Successfully parsed planned boards.');
        
        const teacherId = 'f0963052-ab2f-4434-9e67-7a31da62b184';
        let sql = `BEGIN; \n`;
        // 1. Delete old schedules
        sql += `DELETE FROM public.schedules WHERE teacher_id = '${teacherId}'; \n`;
        
        // 2. Insert new schedules
        plannedBoards.forEach(board => {
          if (!board.students) return;
          board.students.forEach(s => {
            const studentId = s.isBreak ? null : s.id;
            const dayOfWeek = board.dayOfWeek;
            const timeSlot = s.assignedTime;
            const room_id = board.roomId || null;
            const duration = s.duration || 30;
            const status = s.isBreak ? 'approved' : 'ready_for_admin_review';
            
            if (studentId) {
              sql += `INSERT INTO public.schedules (school_id, teacher_id, student_id, day_of_week, time_slot, room_id, duration, status) 
                      VALUES ('${schoolId}', '${teacherId}', '${studentId}', ${dayOfWeek}, '${timeSlot}', ${room_id ? `'${room_id}'` : 'NULL'}, ${duration}, '${status}'); \n`;
            } else {
              sql += `INSERT INTO public.schedules (school_id, teacher_id, student_id, day_of_week, time_slot, room_id, duration, status) 
                      VALUES ('${schoolId}', '${teacherId}', NULL, ${dayOfWeek}, '${timeSlot}', ${room_id ? `'${room_id}'` : 'NULL'}, ${duration}, '${status}'); \n`;
            }
          });
        });
        
        sql += `COMMIT;`;
        
        // Execute the transaction
        conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`, (err2, stream2) => {
          if (err2) throw err2;
          stream2.on('close', () => {
            console.log('Schedules table synchronized with planned_boards.');
            
            // 3. Regenerate occurrences (We can run simulate occurrences using the script or just invoke the generator logic)
            // Let's run a separate generator node call inside docker or directly via node in a scratch script.
            console.log('Now regenerating occurrences...');
            
            conn.end();
            runGenerator();
          }).on('data', (d) => {
            console.log('Sync output:', d.toString());
          });
        });
        
      } catch (e) {
        console.error('JSON parse error:', e);
        conn.end();
      }
    }).on('data', (data) => {
      buffer += data;
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);

function runGenerator() {
  // Let's run the backend occurrences generation using a quick script
  const conn2 = new Client();
  conn2.on('ready', () => {
    // Let's write a node script that calls generateOccurrencesForTeacher or simulates it
    // Wait, let's write a database query that deletes occurrences and inserts them based on new schedules
    const todayStr = '2026-05-30'; // Saturday
    const genSql = `
      -- Delete future occurrences
      DELETE FROM public.schedule_occurrences WHERE teacher_id = 'f0963052-ab2f-4434-9e67-7a31da62b184' AND date >= '${todayStr}';
      
      -- We will write a script to do the complex date loop calculation in JS and execute insert queries.
    `;
    
    // We will execute a JS script locally that uses ssh to do the dates loop and inserts.
    conn2.end();
    
    setTimeout(() => {
      const runner = require('./populate_via_ssh.js'); 
      console.log('Finished trigger.');
    }, 500);
  }).connect(config);
}
