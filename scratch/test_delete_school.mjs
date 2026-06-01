import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testDelete() {
  const { data: schools, error: schoolError } = await supabase.from('schools').select('*');
  if (schoolError) {
    console.error('Error fetching schools:', schoolError);
    return;
  }
  console.log('Available schools:');
  schools.forEach(s => console.log(`- ${s.name} (ID: ${s.id})`));

  const testSchool = schools.find(s => s.name === 'Testlauf' || s.name.toLowerCase().includes('test'));
  if (!testSchool) {
    console.log('No test school found to delete.');
    return;
  }

  console.log(`Attempting to delete school: ${testSchool.name} (${testSchool.id})`);
  const { error: deleteError } = await supabase.from('schools').delete().eq('id', testSchool.id);
  if (deleteError) {
    console.error('Delete failed with error details:', JSON.stringify(deleteError, null, 2));
  } else {
    console.log('Delete succeeded!');
  }
}

testDelete();
