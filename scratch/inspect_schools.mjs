import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: schools, error: schoolErr } = await supabase
    .from('schools')
    .select('*');
  console.log("Schools count:", schools ? schools.length : 0);
  console.log("School error:", schoolErr);
  if (schools) {
    schools.forEach(s => {
      console.log(JSON.stringify(s, null, 2));
    });
  }

  const { data: stats } = await supabase.from('school_user_statistics').select('*');
  console.log("Stats count:", stats ? stats.length : 0);
  if (stats) {
    stats.forEach(st => console.log("Stat:", st));
  }

  const { data: rpcOverview, error: rpcErr } = await supabase.rpc('get_master_schools_overview');
  console.log("RPC Overview count:", rpcOverview ? rpcOverview.length : 0, "Error:", rpcErr);
  if (rpcOverview) {
    rpcOverview.forEach(ro => console.log("RPC Overview row:", ro));
  }
}

check();
