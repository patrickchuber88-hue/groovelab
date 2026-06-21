import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
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
