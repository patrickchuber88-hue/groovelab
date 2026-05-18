import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env.local from root
dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("Fetching a single user to see all columns...");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else if (data && data.length > 0) {
    console.log("Columns on users table:", Object.keys(data[0]));
    console.log("Example record:", data[0]);
  } else {
    console.log("No users found in database!");
  }
}

inspect();
