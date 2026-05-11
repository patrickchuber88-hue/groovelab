
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkColumns() {
  const { data, error } = await supabase.from('lab_planning').select('*').limit(1);
  if (error) {
    console.error('Error fetching lab_planning:', error.message);
    const { data: data2, error: error2 } = await supabase.from('user_availability').select('*').limit(1);
    if (error2) {
       console.error('Error fetching user_availability:', error2.message);
    } else {
       console.log('user_availability exists. Columns:', Object.keys(data2[0] || {}));
    }
    return;
  }
  if (data) {
    console.log('lab_planning exists. Columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
