const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzk1NTM4NDMsImV4cCI6MTkzNzIzMzg0M30.0QQXccgKPJcDdKpSjAPeYfBXxH4-ZwJHcxCQNJcJLTI';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: rooms, error } = await supabase.from('rooms').select('*');
  console.log('ALL ROOMS:', rooms, 'Error:', error);
}

run();
