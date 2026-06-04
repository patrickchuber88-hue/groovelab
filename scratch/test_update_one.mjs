import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

async function run() {
  // Find a student first
  const { data: students } = await supabase
    .from('users')
    .select('id, first_name, last_name, qr_token, ausweis_nummer')
    .eq('role', 'student')
    .limit(1);

  if (!students || students.length === 0) {
    console.log("No students found");
    return;
  }

  const student = students[0];
  console.log("Found student:", student);

  const newQr = '11111111-1111-1111-1111-111111111111';
  const newPin = 'GL-9999';

  console.log(`Attempting to update ${student.first_name} to QR=${newQr}, Pin=${newPin}...`);

  const { data, error, status, statusText } = await supabase
    .from('users')
    .update({
      qr_token: newQr,
      ausweis_nummer: newPin
    })
    .eq('id', student.id)
    .select();

  console.log("Update response:", { data, error, status, statusText });
}

run();
