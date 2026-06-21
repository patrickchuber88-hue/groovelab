import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabase = createClient(supabaseUrl, SERVICE_KEY);

async function run() {
  const targetSchoolIds = [
    '3bf920b9-49b5-4aca-be79-42359fef3f1f',
    '01329036-22f0-4424-b9e5-9064df450841',
    '46bace52-2d7a-4a87-aae2-5778ded238cb',
    '532b4d91-67c8-4194-9cde-f231ecb12bdd',
    '41c07ebd-1b59-4f75-8359-408d957dd080',
    '109e83b3-a1ff-42f0-95b9-db6562f8e77d',
    'd5838bdd-d779-424b-94d3-878d12c60140',
    '5e0b8364-12dd-43b1-aeb5-17417d53e957',
    '6abb3e70-cd0f-420d-b963-64f977f66a64',
    'ca3c620a-7cde-4281-8522-ae278e137995'
  ];

  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city')
    .in('id', targetSchoolIds);

  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log(`Successfully fetched ${data.length} schools:`);
    data.forEach(s => {
      console.log(`- ${s.id}: ${s.name} in ${s.city}`);
    });
  }
}

run();
