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
  console.log("Fetching schedules...");
  const { data: schedules, error: fetchErr } = await supabase
    .from('schedules')
    .select('*')
    .in('status', ['approved', 'ready_for_admin_review', 'draft', 'pending_parent_approval']);

  if (fetchErr || !schedules) {
    console.error("Failed to fetch schedules:", fetchErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules.`);

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  let sql = `DELETE FROM public.schedule_occurrences WHERE date >= '${todayStr}';\n`;

  schedules.forEach(schedule => {
    const { id: scheduleId, student_id, teacher_id, day_of_week, time_slot, duration } = schedule;
    if (!student_id || !day_of_week || !time_slot) return;

    for (let i = 0; i < 4; i++) {
      const targetDate = new Date();
      const currentDay = today.getDay() || 7;
      const diff = day_of_week - currentDay + (i * 7);
      targetDate.setDate(today.getDate() + diff);

      const ty = targetDate.getFullYear();
      const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const td = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${ty}-${tm}-${td}`;
      if (dateStr < todayStr) continue;

      const startTime = time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot;
      const dur = duration || 45;

      const studVal = student_id && student_id !== 'null' ? `'${student_id}'` : 'NULL';

      sql += `INSERT INTO public.schedule_occurrences (schedule_id, student_id, teacher_id, date, start_time, duration, status) VALUES ('${scheduleId}', ${studVal}, '${teacher_id}', '${dateStr}', '${startTime}', ${dur}, 'scheduled');\n`;
    }
  });

  console.log("Connecting SSH...");
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
