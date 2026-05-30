const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'http://127.0.0.1:8081';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Fetching users from direct Kong host port...");
  const { data, error } = await supabase.from('users').select('id, first_name');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Users count:", data.length);
  }
}
run();
