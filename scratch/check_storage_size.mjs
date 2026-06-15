import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
  const sql = `
    SELECT bucket_id, count(*), sum((metadata->>'size')::bigint) as total_size_bytes 
    FROM storage.objects 
    GROUP BY bucket_id;
  `;
  
  console.log("Running SQL query via RPC...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error("Error executing SQL:", error);
    return;
  }
  
  console.log("Storage buckets size analysis:");
  console.log(data);

  // Also query song table bypassing RLS
  const sql2 = `
    SELECT count(*), count(playalong_url) as with_playalong 
    FROM public.songs;
  `;
  const { data: data2 } = await supabase.rpc('execute_sql', { sql_query: sql2 });
  console.log("\nSongs stats bypassing RLS:", data2);
}

runSql();
