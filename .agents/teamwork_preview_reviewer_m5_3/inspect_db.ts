import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const masterAdminId = '99999999-9999-9999-9999-999999999999';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-id': masterAdminId
      }
    }
  });
  
  // Get all campus events
  const { data: events, error: errEv } = await supabase.from('campus_events').select('*');
  console.log('Events in DB:', events);
  if (errEv) console.error('Error fetching events:', errEv);
  
  // Get all program points
  const { data: points, error: errPts } = await supabase.from('campus_event_program_points').select('*');
  console.log('Program Points in DB:', points);
  if (errPts) console.error('Error fetching program points:', errPts);
}

main();
