import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': SILAS_ID
    }
  }
});

async function main() {
  console.log("Checking if student Silas Meier can insert a session...");
  
  // First, find an active station
  const { data: stations, error: stErr } = await supabase.from('stations').select('id, name').limit(1);
  if (stErr || !stations || stations.length === 0) {
    console.error("Failed to fetch a station:", stErr);
    return;
  }
  
  const stationId = stations[0].id;
  console.log(`Using station: ${stations[0].name} (${stationId})`);
  
  const now = new Date().toISOString();
  
  // Try inserting
  const { data: insertedSession, error: insErr } = await supabase
    .from('sessions')
    .insert({
      user_id: SILAS_ID,
      station_id: stationId,
      check_in_time: now
    })
    .select()
    .single();
    
  if (insErr) {
    console.error("❌ Session INSERT failed:", insErr.message, "Code:", insErr.code);
  } else {
    console.log("✅ Session INSERT succeeded:", insertedSession);
    
    // Now try checking out
    const { data: updatedSession, error: updErr } = await supabase
      .from('sessions')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', insertedSession.id)
      .select()
      .single();
      
    if (updErr) {
      console.error("❌ Session UPDATE failed:", updErr.message, "Code:", updErr.code);
    } else {
      console.log("✅ Session UPDATE succeeded:", updatedSession);
    }
  }
}

main();
