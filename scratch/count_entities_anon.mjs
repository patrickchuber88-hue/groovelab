import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function count() {
  console.log("Checking DB counts with ANON KEY...");
  
  const start = Date.now();
  const { data, error } = await supabase
    .from('school_user_statistics')
    .select('*');
  
  console.log("Time taken:", Date.now() - start, "ms");
  if (error) {
    console.error("Error fetching school_user_statistics:", error);
  } else {
    console.log("Fetched statistics count:", data.length);
    const totalTeachers = data.reduce((acc, curr) => acc + (curr.teachers || 0), 0);
    const totalStudents = data.reduce((acc, curr) => acc + (curr.students || 0), 0);
    console.log("Aggregated sum: teachers =", totalTeachers, ", students =", totalStudents);
  }
}

count().catch(console.error);
