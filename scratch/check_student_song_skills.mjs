import dns from 'dns';

// Correctly override DNS resolution to support both options.all array format and single string format
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  
  if (hostname === 'supabase.178.105.10.2.sslip.io' || hostname === 'supabase.campus-groovelab.de') {
    if (opts.all) {
      return cb(null, [{ address: '178.105.10.2', family: 4 }]);
    }
    return cb(null, '178.105.10.2', 4);
  }
  return originalLookup.call(dns, hostname, options, cb);
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

// Bypass SSL certificate check since we are querying a local IP over HTTPS without public DNS validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Searching for users named Dominik or Estelle...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .or('first_name.ilike.%Dominik%,last_name.ilike.%Dominik%,first_name.ilike.%Estelle%,last_name.ilike.%Estelle%');

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  console.log(`Found ${users.length} users:`);
  console.log(users);

  for (const user of users) {
    console.log(`\nFetching user_song_skills for user: ${user.first_name} ${user.last_name} (${user.id})...`);
    const { data: skills, error: skillsError } = await supabase
      .from('user_song_skills')
      .select('id, user_id, song_id, progress_percent, is_stage_ready, songs(id, title, artist, teacher_id)')
      .eq('user_id', user.id);

    if (skillsError) {
      console.error('Error fetching song skills:', skillsError);
      continue;
    }

    console.log(`Found ${skills.length} song skills:`);
    skills.forEach(s => {
      console.log(`- ID: ${s.id}, Song ID: ${s.song_id}, Title: ${s.songs?.title}, Artist: ${s.songs?.artist}, Progress: ${s.progress_percent}%, Stage Ready: ${s.is_stage_ready}, Teacher ID: ${s.songs?.teacher_id}`);
    });
  }
}

check();
