import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkActivationDays() {
  const userId = "0f22f0ba-df3c-457e-b600-7c4c2bce745c"; // Dominik

  const { data: actDay, error } = await supabase
    .from('activation_days')
    .select('*')
    .eq('student_id', userId);

  console.log("Activation day error:", error);
  console.log("Activation day data:", actDay);
}

checkActivationDays();
