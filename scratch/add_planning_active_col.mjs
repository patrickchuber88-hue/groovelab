import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const sql = `
  UPDATE public.campus_events SET is_planning_active = TRUE WHERE id IS NOT NULL;
`;

console.log("Setting existing events to planning active with correct key...");
const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
console.log("Error:", error);
console.log("Data:", data);
