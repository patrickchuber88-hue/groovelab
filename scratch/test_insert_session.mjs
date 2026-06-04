import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testInsert() {
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'; // Patrick Huber (teacher)
  const stationId = 'd5c40252-09a9-4530-b5cb-75907231a487'; // Lehrer iPad station
  const now = new Date().toISOString();

  // Try to insert a session for the teacher
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: teacherId,
      station_id: stationId,
      gps_verified: true,
      check_in_time: now
    })
    .select()
    .single();

  console.log("Insert result:", data, error);
}
testInsert();
