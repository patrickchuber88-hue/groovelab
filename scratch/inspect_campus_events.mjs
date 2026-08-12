import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const { data: cols, error: err } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campus_events';
    `
  });
  console.log("COLUMNS:", cols, err);

  const { data: events, error: eErr } = await supabase.from('campus_events').select('*');
  console.log("EVENTS:", events, eErr);
}
run();
