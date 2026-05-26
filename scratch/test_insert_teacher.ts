import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testInsert() {
  const schoolId = '11111111-1111-1111-1111-111111111111';
  
  const { data, error } = await supabase.from('users').insert({
    school_id: schoolId,
    role: 'teacher',
    first_name: 'Test',
    last_name: 'Teacher',
    email: 'test@teacher.com',
    instrument: 'Guitar',
    max_students: 10,
    ausweis_nummer: 'GL-9999',
    teacher_qr_token: 't_testtoken',
    is_active: false,
    is_app_user: false
  }).select();
  
  if (error) {
    console.error("INSERT ERROR:", error.message, error.details);
  } else {
    console.log("INSERT SUCCESS:", JSON.stringify(data, null, 2));
    
    // Clean up
    await supabase.from('users').delete().eq('id', data[0].id);
  }
}

testInsert();
