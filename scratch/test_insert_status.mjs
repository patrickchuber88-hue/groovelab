import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function test() {
  console.log("Updating Musikschulfest event submission_deadline...");
  const { data, error } = await supabase
    .from('campus_events')
    .update({
      submission_deadline: '2026-06-20T12:00'
    })
    .eq('id', '51ed241a-71fc-44a2-8c10-eda259260615')
    .select('*')
    .single();

  console.log("Update result data:", data ? "SUCCESS" : "FAIL", "Error:", error);
  if (data) {
    console.log("Saved submission_deadline:", data.submission_deadline);
  }
}
test();
