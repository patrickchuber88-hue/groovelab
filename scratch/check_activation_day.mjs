import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const userId = '0f22f0ba-df3c-457e-b600-7c4c2bce745c'; // Dominik
  const { data, error } = await supabase
    .from('activation_days')
    .select('*')
    .eq('student_id', userId)
    .maybeSingle();

  console.log("Activation day record for Dominik:", data, error);
}

run();
