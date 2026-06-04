const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  const { data: rooms, error } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Rooms count: ${rooms.length}`);
  const nameCounts = {};
  rooms.forEach(r => {
    const name = r.name.toLowerCase().trim();
    if (!nameCounts[name]) nameCounts[name] = [];
    nameCounts[name].push(r);
  });
  
  let duplicatesFound = false;
  for (const [name, list] of Object.entries(nameCounts)) {
    if (list.length > 1) {
      duplicatesFound = true;
      console.log(`Room "${name}" is duplicated ${list.length} times:`);
      list.forEach(r => {
        console.log(`  - ID: ${r.id}, floor: ${r.floor}`);
      });
    }
  }
  
  if (!duplicatesFound) {
    console.log('No duplicate room names found!');
  }
}

run();
