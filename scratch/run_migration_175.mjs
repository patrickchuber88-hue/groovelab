import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
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
