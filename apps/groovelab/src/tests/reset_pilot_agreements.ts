import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const client = createClient(supabaseUrl, serviceKey || "");

async function main() {
  console.log('Resetting pilot agreements...');
  const { data, error } = await client
    .from('pilot_agreements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error('Error deleting agreements:', error);
  } else {
    console.log('Successfully deleted all records from pilot_agreements.', data);
  }
}

main().catch(console.error);
