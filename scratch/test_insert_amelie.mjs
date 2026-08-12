import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testInsert() {
  const userId = "64e54fef-e644-43cc-8071-eac432bb7fee"; // Amelie Klein (is_active = true)
  const stationId = "fa505f9b-75b4-4c0c-933e-20ca006d9877";

  console.log("1. Cleaning up active sessions for Amelie...");
  await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('user_id', userId).is('check_out_time', null);

  console.log("2. Inserting a new session for Amelie...");
  const insertRes = await supabase.from('sessions').insert({
    user_id: userId,
    station_id: stationId,
    gps_verified: true,
    check_in_time: new Date().toISOString()
  }).select();

  console.log("Insert result:", JSON.stringify(insertRes, null, 2));

  if (insertRes.error) {
    console.error("Insert failed!");
    return;
  }

  const sessionId = insertRes.data[0].id;

  console.log("Waiting 2 seconds...");
  await new Promise(r => setTimeout(r, 2000));

  const { data: verifySession } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  console.log("Session state after 2 seconds for Amelie:", JSON.stringify(verifySession, null, 2));
}

testInsert();
