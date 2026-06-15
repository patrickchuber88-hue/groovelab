import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const customFetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('x-user-id', '88888888-8888-8888-8888-888888888888');
  return fetch(input, { ...init, headers });
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch
  }
});

async function checkPlayalongs() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, artist, playalong_url')
    .not('playalong_url', 'is', null);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Songs data with playalong_url:");
  console.log(JSON.stringify(songs, null, 2));
}

checkPlayalongs();
