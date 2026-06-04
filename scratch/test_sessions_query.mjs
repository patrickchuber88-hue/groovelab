import { createClient } from '@supabase/supabase-js'

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

const schoolId = "74713df2-6176-4a41-a8cd-9fbebe34e9b8";

console.log("Testing sessions query with profiles:users!inner(*)...");
const { data, error } = await supabase
  .from('sessions')
  .select('*, profiles:users!inner(*), stations(*)')
  .eq('profiles.school_id', schoolId)
  .is('check_out_time', null);

console.log("Error:", error);
console.log("Data count:", data?.length);
