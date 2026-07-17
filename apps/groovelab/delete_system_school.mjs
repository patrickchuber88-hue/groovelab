import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteSystemSchool() {
  const { data, error } = await supabase
    .from('schools')
    .delete()
    .eq('id', '11111111-1111-1111-1111-111111111111');

  if (error) {
    console.error("Error deleting school:", error);
  } else {
    console.log("Successfully deleted school 11111111-1111-1111-1111-111111111111. Data:", data);
  }
}

deleteSystemSchool();
