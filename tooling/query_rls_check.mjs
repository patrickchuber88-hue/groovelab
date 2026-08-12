import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: schedules, error: schErr } = await supabase
    .from('schedules')
    .select('*, users!schedules_student_id_fkey(first_name, last_name)')
    .limit(5);

  console.log('Schedules (service role):', schedules, schErr);

  const { data: homeworks, error: hwErr } = await supabase
    .from('progress_matrix')
    .select('*, users!progress_matrix_student_id_fkey(first_name, last_name)')
    .eq('is_current_homework', true)
    .limit(5);

  console.log('Homeworks (service role):', homeworks, hwErr);
}

run().catch(console.error);
