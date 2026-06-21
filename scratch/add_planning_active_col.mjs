import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const sql = `
  UPDATE public.campus_events SET is_planning_active = TRUE WHERE id IS NOT NULL;
`;

console.log("Setting existing events to planning active with correct key...");
const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
console.log("Error:", error);
console.log("Data:", data);
