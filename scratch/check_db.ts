import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('schools').select('*');
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    for (const school of data) {
      console.log(`School: ${school.name}`);
      console.log(` - ID: ${school.id}`);
      console.log(` - has_campus_subscription: ${school.has_campus_subscription}`);
      console.log(` - has_groovelab_subscription: ${school.has_groovelab_subscription}`);
      console.log(` - subscription_bypass: ${school.subscription_bypass}`);
      console.log(` - status: ${school.status}`);
      console.log(` - is_billing_booked: ${school.is_billing_booked}`);
    }
  }
}

run();
