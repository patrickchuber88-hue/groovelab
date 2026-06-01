import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
  const qrToken = 't_' + Math.random().toString(36).substring(2, 12);
  
  // Let's get the first school id from DB
  const { data: schools } = await supabase.from('schools').select('id').limit(1);
  const schoolId = schools?.[0]?.id;
  
  if (!schoolId) {
    console.error("No school found in database.");
    return;
  }

  console.log("Attempting to insert teacher with school ID:", schoolId);

  const { data, error } = await supabase
    .from('users')
    .insert({
      school_id: schoolId,
      role: 'teacher',
      first_name: 'Test',
      last_name: 'Teacher',
      email: 'test.teacher@musaek.de',
      instrument: 'Klavier',
      max_students: 10,
      ausweis_nummer: pin,
      teacher_qr_token: qrToken,
      is_active: false,
      is_app_user: false,
      is_campus_active: true,
      is_groovelab_active: false,
      contract_ends_at: null
    })
    .select();

  if (error) {
    console.error('Error inserting teacher:', error);
  } else {
    console.log('Successfully inserted teacher:', data);
    // clean up
    await supabase.from('users').delete().eq('id', data[0].id);
    console.log('Cleaned up successfully');
  }
}
run();
