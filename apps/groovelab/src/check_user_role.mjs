import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NTU4MDYxLCJleHAiOjIxMDI5MTgwNjF9.FZWOhJ8B7coAqv4IX3dKFYFerKwODGiQm-5IFFKiPIc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: planning, error } = await supabase
    .from('lab_planning')
    .select('*');
  console.log('LAB PLANNING ENTRIES:', planning);
  console.log('ERROR:', error);
}

run();
