import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '97e73f5d-b6d6-47d5-bb47-18ad02bae725'
    }
  }
});

const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';

async function test() {
  console.log("Simulating all Secretary Dashboard queries...");

  const queries = [
    { name: 'schools', q: supabase.from('schools').select('*').eq('id', schoolId).single() },
    { name: 'users', q: supabase.from('users').select('*').eq('school_id', schoolId) },
    { name: 'pending_students_decrypted', q: supabase.from('pending_students_decrypted').select('*').eq('school_id', schoolId) },
    { name: 'activation_days', q: supabase.from('activation_days').select('*') },
    { name: 'schedules', q: supabase.from('schedules').select('*').eq('school_id', schoolId) },
    { name: 'rooms', q: supabase.from('rooms').select('*').eq('school_id', schoolId) },
    { name: 'school_equipment', q: supabase.from('school_equipment').select('*').eq('school_id', schoolId) },
    { name: 'stations', q: supabase.from('stations').select('*, rooms!inner(*)').eq('rooms.school_id', schoolId) },
    { name: 'system_alerts', q: supabase.from('system_alerts').select('*').eq('school_id', schoolId) },
    { name: 'sessions', q: supabase.from('sessions').select('*').eq('school_id', schoolId) },
    { name: 'help_requests', q: supabase.from('help_requests').select('*').eq('school_id', schoolId) },
    { name: 'groovelab_tickets', q: supabase.from('groovelab_tickets').select('*').eq('school_id', schoolId) },
    { name: 'subjects', q: supabase.from('subjects').select('*').eq('school_id', schoolId) },
    { name: 'cooperations', q: supabase.from('cooperations').select('*').eq('school_id', schoolId) },
    { name: 'campus_announcements', q: supabase.from('campus_announcements').select('*').eq('school_id', schoolId) },
    { name: 'campus_events', q: supabase.from('campus_events').select('*').eq('school_id', schoolId) },
    { name: 'crisis_notifications', q: supabase.from('crisis_notifications').select('*').eq('school_id', schoolId) }
  ];

  for (const query of queries) {
    const start = Date.now();
    const { data, error } = await query.q;
    const duration = Date.now() - start;
    if (error) {
      console.error(`❌ Query [${query.name}] FAILED in ${duration}ms:`, error.message, error);
    } else {
      console.log(`✅ Query [${query.name}] succeeded in ${duration}ms. Fetched ${Array.isArray(data) ? data.length : '1'} rows.`);
    }
  }
}
test();
