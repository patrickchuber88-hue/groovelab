import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const targetSchoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
const patrickAdminId = '00000000-0000-0000-0000-000000000000';

console.log(`Updating user ${patrickAdminId} school_id to ${targetSchoolId}...`);

const { data, error } = await supabase
  .from('users')
  .update({ school_id: targetSchoolId })
  .eq('id', patrickAdminId)
  .select();

if (error) {
  console.error('Error updating user:', error);
} else {
  console.log('Update successful! Result:', JSON.stringify(data, null, 2));
}
