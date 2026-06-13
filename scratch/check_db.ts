import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  'https://supabase.178.105.10.2.sslip.io',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc'
);

async function check() {
  console.log("Querying active student sessions on sslip.io...");
  const { data: activeSessions, error } = await supabase
    .from('sessions')
    .select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen)')
    .is('check_out_time', null)
    .eq('users.school_id', '0e3957eb-3a5f-4a0b-9dfd-b4f0ed863a32')
    .eq('users.role', 'student');

  if (error) {
    console.error("Query failed:", error);
    return;
  }

  console.log("Active student sessions found:", activeSessions?.length);
  for (const s of (activeSessions || [])) {
    console.log("Session row:", s);
  }
}

check();
