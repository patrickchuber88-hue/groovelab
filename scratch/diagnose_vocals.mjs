import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Searching for user '2 Schüler'...");
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%2 Schüler%');

  if (userError || !users || users.length === 0) {
    console.error("User not found or error:", userError);
    return;
  }

  const user = users[0];
  console.log(`Found user: ${user.first_name} ${user.last_name} (ID: ${user.id})`);

  console.log("\n--- Checking user_song_skills (individual practice) ---");
  const { data: skills, error: skillsError } = await supabase
    .from('user_song_skills')
    .select('*, songs(id, title)')
    .eq('user_id', user.id);

  if (skillsError) {
    console.error("Skills fetch error:", skillsError);
  } else {
    skills.forEach(s => {
      console.log(`- Skill: ${s.songs?.title} | Instrument: ${s.instrument} | Progress: ${s.progress_percent}% | Stage Ready: ${s.is_stage_ready}`);
    });
  }

  console.log("\n--- Checking band memberships ---");
  const { data: memberships, error: memError } = await supabase
    .from('band_members')
    .select('*, bands(*)')
    .eq('user_id', user.id);

  if (memError) {
    console.error("Memberships error:", memError);
  } else {
    memberships.forEach(m => {
      console.log(`- Band Membership: ${m.bands?.name} | Instrument: ${m.instrument}`);
    });
  }

  console.log("\n--- Checking band_song_slots (vocals/singing) ---");
  const { data: slots, error: slotsError } = await supabase
    .from('band_song_slots')
    .select('*, band_songs(*, bands(*), songs(*))')
    .eq('user_id', user.id);

  if (slotsError) {
    console.error("Slots fetch error:", slotsError);
  } else {
    slots.forEach(s => {
      console.log(`- Slot in Band Song: ${s.band_songs?.songs?.title} (${s.band_songs?.bands?.name}) | Instrument: ${s.instrument} | Status: ${s.status}`);
    });
  }
}

run();
