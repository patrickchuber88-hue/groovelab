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

async function listBucket() {
  console.log("Listing folders/files in groovelab-assets bucket...");
  const { data: rootFiles, error } = await supabase.storage.from('groovelab-assets').list('', { limit: 100 });
  
  if (error) {
    console.error("Error listing root:", error);
    return;
  }
  
  console.log("Root contents:", rootFiles);

  for (const item of rootFiles) {
    if (item.id === null) {
      // It's a folder, list its contents
      console.log(`\nListing folder: ${item.name}`);
      const { data: subFiles } = await supabase.storage.from('groovelab-assets').list(item.name, { limit: 100 });
      console.log(`Contents of ${item.name}:`, subFiles);
    }
  }
}

listBucket();
