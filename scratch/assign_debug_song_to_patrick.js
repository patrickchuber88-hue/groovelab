import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const songId = "5b0f3552-b729-46d2-8d54-9ce7e6602a59"; // Debug Song
  const patrickId = "03564b1c-e2bb-4ccb-be95-b9fd1ef34829"; // Patrick Huber
  const klausId = "9c629cb8-9241-4d5e-9151-da1fd6f4cde4"; // Klaus Siebold

  console.log(`Assigning song ${songId} to Patrick Huber (${patrickId})...`);
  const { data: updateRes, error: updateError } = await supabase
    .from('songs')
    .update({ teacher_id: patrickId })
    .eq('id', songId)
    .select();

  if (updateError) {
    console.error("Update Error:", updateError);
    return;
  }
  console.log("Update Success! Song current details:", updateRes[0]);

  // Run the student song query again
  console.log("\nRunning verification query for student Magdalena Woldert...");
  const { data: songsList, error: listError } = await supabase
    .from('songs')
    .select('id, title, artist, teacher_id, is_groovelab_active')
    .eq('school_id', "74713df2-6176-4a41-a8cd-9fbebe34e9b8")
    .eq('is_groovelab_active', true)
    .eq('teacher_id', patrickId);

  if (listError) {
    console.error("Songs List Query Error:", listError);
  } else {
    console.log(`Songs List Query Success! Songs count returned: ${songsList.length}`);
    console.log("Returned songs:", songsList);
  }

  // Restore back to Klaus to keep the original state if needed, or leave it assigned to Patrick!
  // Wait, let's restore it so we don't mess up their testing DB unless they want to.
  // Actually, restoring it to Klaus returns Magdalena's view back to 0 songs. Let's do that.
  console.log(`\nRestoring song ${songId} back to Klaus Siebold (${klausId})...`);
  await supabase
    .from('songs')
    .update({ teacher_id: klausId })
    .eq('id', songId);
  console.log("Restore complete.");
}

run();
