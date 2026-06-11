import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': SILAS_ID
    }
  }
});

async function main() {
  console.log("=== Testing live get_student_emails as Silas Meier ===");
  const { data: initialEmails, error: getErr } = await supabase
    .rpc('get_student_emails', { student_id_param: SILAS_ID });
  if (getErr) {
    console.error("Get emails failed:", getErr);
  } else {
    console.log("Get emails successful:", initialEmails);
  }

  console.log("\n=== Testing live update_student_emails as Silas Meier ===");
  const { data: updateRes, error: updateErr } = await supabase
    .rpc('update_student_emails', {
      student_id_param: SILAS_ID,
      input_student_email: 'silas_live@groovelab.de',
      input_parent_email: 'eltern_live@groovelab.de'
    });
  if (updateErr) {
    console.error("Update emails failed:", updateErr);
  } else {
    console.log("Update emails successful:", updateRes);
  }

  console.log("\n=== Fetching updated emails to verify ===");
  const { data: finalEmails, error: finalErr } = await supabase
    .rpc('get_student_emails', { student_id_param: SILAS_ID });
  if (finalErr) {
    console.error("Get final emails failed:", finalErr);
  } else {
    console.log("Get final emails successful:", finalEmails);
  }
}

main();
