import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const sqlFilePath = './supabase/migrations/175_allow_students_view_assigned_program_points.sql';
const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log("Applying migration 175_allow_students_view_assigned_program_points.sql...");
const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });

if (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} else {
  console.log("Migration applied successfully!");
  console.log("Result:", data);
  process.exit(0);
}
