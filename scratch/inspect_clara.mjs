import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
// Use the service key or the anon key? Let's check if the service key is available, or use anon first.
// Wait, we need the encryption key to decrypt first name, or we can just query everything from the tables.
const supabase = createClient(url, key);

async function check() {
  console.log("Checking Clara Krüger in database...");
  
  // Let's get the encryption key first
  const { data: encKey, error: keyErr } = await supabase.rpc('get_encryption_key');
  console.log("Encryption Key fetched:", encKey ? "YES" : "NO", keyErr);

  // Let's query student_last_names where last_name is Krüger
  const { data: lastNames, error: lnErr } = await supabase
    .from('student_last_names')
    .select('*')
    .ilike('last_name', '%Krüger%');
  
  console.log("\nLast Names matches:", lastNames, lnErr);

  if (lastNames && lastNames.length > 0) {
    for (const ln of lastNames) {
      const studentId = ln.student_id;
      
      // Get student row
      const { data: student, error: stErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      console.log(`\n--- Student ID: ${studentId} ---`);
      console.log("Student Row:", student, stErr);

      // Get first name
      const { data: firstNameRow } = await supabase
        .from('student_first_names')
        .select('*')
        .eq('student_id', studentId)
        .single();
      console.log("Encrypted First Name Row:", firstNameRow);
      
      if (firstNameRow && encKey) {
        // Try decrypting via RPC or direct decryption if we can
        const { data: decryptedName, error: decErr } = await supabase.rpc('decrypt_val', {
          encrypted_val: firstNameRow.first_name
        });
        console.log("Decrypted First Name via decrypt_val RPC:", decryptedName, decErr);
      }

      // Get activation day
      const { data: actDay } = await supabase
        .from('activation_days')
        .select('*')
        .eq('student_id', studentId)
        .single();
      console.log("Activation Day:", actDay);
    }
  }
}

check().catch(console.error);
