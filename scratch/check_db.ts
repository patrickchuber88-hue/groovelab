import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  console.log("Querying users...");
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, sick_until, personal_pin, created_at, preferred_room_ids, planned_boards, student_billing_payment_method')
    .limit(5);

  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log("Query succeeded! Fetched", data?.length, "rows.");
    if (data && data.length > 0) {
      console.log("Sample row keys:", Object.keys(data[0]));
    }
  }
}

check();
