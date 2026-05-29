const { Client } = require('ssh2');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

async function run() {
  const teacherId = 'f0963052-ab2f-4434-9e67-7a31da62b184';
  console.log("Fetching current schedules for teacher Patrick...");
  const { data: schedules, error: fetchErr } = await supabase
    .from('schedules')
    .select('*')
    .eq('teacher_id', teacherId);

  if (fetchErr || !schedules) {
    console.error("Failed to fetch schedules:", fetchErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules.`);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let sql = `DELETE FROM public.schedule_occurrences WHERE teacher_id = '${teacherId}' AND date >= '${todayStr}';\n`;

  schedules.forEach(schedule => {
    const { id: scheduleId, student_id, day_of_week, time_slot, duration } = schedule;
    if (!student_id || student_id === 'null' || !day_of_week || !time_slot) return;

    for (let i = 0; i < 4; i++) {
      const targetDate = new Date();
      const currentDay = today.getDay() || 7;
      const diff = day_of_week - currentDay + (i * 7);
      targetDate.setDate(today.getDate() + diff);

      const dateStr = targetDate.toISOString().split('T')[0];
      if (dateStr < todayStr) continue;

      const startTime = time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot;
      const dur = duration || 45;

      sql += `INSERT INTO public.schedule_occurrences (schedule_id, student_id, teacher_id, date, start_time, duration, status) VALUES ('${scheduleId}', '${student_id}', '${teacherId}', '${dateStr}', '${startTime}', ${dur}, 'scheduled');\n`;
    }
  });

  console.log("Connecting SSH to execute SQL...");
  const conn = new Client();
  conn.on('ready', () => {
    console.log('SSH connection established successfully.');

    conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
      if (err) throw err;
      
      stream.on('close', (code, signal) => {
        console.log(`SQL execution finished with code ${code}.`);
        conn.end();
      }).on('data', (data) => {
        console.log('STDOUT: ' + data);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });

      stream.write(sql);
      stream.end();
    });
  }).on('error', (err) => {
    console.error('SSH Connection Error:', err);
  }).connect(config);
}

run();
