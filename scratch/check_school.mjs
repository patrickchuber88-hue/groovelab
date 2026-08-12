import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSchool() {
  const schoolId = "74713df2-6176-4a41-a8cd-9fbebe34e9b8";

  const { data: school, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();

  console.log("School error:", error);
  console.log("School details:", JSON.stringify(school, null, 2));
}

checkSchool();
