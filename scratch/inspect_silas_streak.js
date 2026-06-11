const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role');

  if (error) {
    console.error(error);
    return;
  }
  console.log('All Users:', users);
}

main();
