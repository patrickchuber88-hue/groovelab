const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Querying students...');
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role');

  if (error) {
    console.error('Error:', error);
    return;
  }

  data.forEach((row) => {
    console.log(`ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Role: ${row.role}`);
  });
}

main();
