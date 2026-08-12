import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Reading migration SQL...");
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/213_add_attachment_url_to_campus_announcements.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Applying Migration 213 on remote database...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Error executing migration:", error);
    process.exit(1);
  } else {
    console.log("Successfully applied Migration 213.");
  }
}
run();
