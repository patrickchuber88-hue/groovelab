import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSessions() {
  const userId = "0f22f0ba-df3c-457e-b600-7c4c2bce745c"; // Dominik

  const { data: sessions, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId);

  console.log("Sessions fetch error:", sessionError);
  console.log("Sessions data:", sessions);

  // Let's check if the table name is correct. Let's query public.sessions or whatever
  const { data: tables, error: schemaError } = await supabase
    .from('sessions')
    .select('*')
    .limit(5);
  console.log("Sessions schema check error:", schemaError);
  console.log("Sessions sample data:", tables);
}

checkSessions();
