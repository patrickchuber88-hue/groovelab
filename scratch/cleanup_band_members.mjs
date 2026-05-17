import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const userId = 'fdcc7041-c58c-432e-b985-1debf6ada5ea'; // 2 Schüler
  console.log(`Cleaning up duplicate band memberships for user ID: ${userId}...`);

  // Fetch all band memberships for the user
  const { data: memberships, error } = await supabase
    .from('band_members')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error("Error fetching memberships:", error);
    return;
  }

  console.log(`Found ${memberships.length} membership records.`);

  const seen = new Set();
  const duplicateIds = [];

  memberships.forEach(m => {
    const key = `${m.band_id}_${m.instrument}`;
    if (seen.has(key)) {
      duplicateIds.push(m.id);
    } else {
      seen.add(key);
    }
  });

  if (duplicateIds.length === 0) {
    console.log("No duplicate band memberships found!");
    return;
  }

  console.log(`Deleting ${duplicateIds.length} duplicate membership(s) with IDs:`, duplicateIds);

  const { data: deleted, error: deleteError } = await supabase
    .from('band_members')
    .delete()
    .in('id', duplicateIds)
    .select();

  if (deleteError) {
    console.error("Error deleting duplicates:", deleteError);
  } else {
    console.log("Successfully deleted:", deleted);
  }
}

run();
