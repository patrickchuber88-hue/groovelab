import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function main() {
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%magdalena%');

  console.log("Users:", users);

  if (users && users.length > 0) {
    const studentId = users[0].id;
    const { data: matrix, error: matrixErr } = await supabase
      .from('progress_matrix')
      .select('*')
      .eq('student_id', studentId);
    
    console.log("Matrix items for Magdalena:", matrix);
  }
}

main();
