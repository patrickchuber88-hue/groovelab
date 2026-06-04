import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, planned_boards');

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  console.log("=== USERS WITH PLANNED BOARDS ===");
  let count = 0;
  for (const user of users) {
    if (user.planned_boards && Array.isArray(user.planned_boards) && user.planned_boards.length > 0) {
      count++;
      console.log(`\nUser: ${user.first_name} ${user.last_name || ''} (${user.role}) - ID: ${user.id}`);
      console.log("Planned Boards:", JSON.stringify(user.planned_boards, null, 2));
    }
  }
  console.log(`\nFound ${count} users with planned boards.`);

  // Let's also check if there's any other table or column containing "boards" or "module" or similar.
  // E.g., is there a "boards" table?
  const { data: tables, error: tablesError } = await supabase
    .rpc('execute_sql', { sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" });
  if (tablesError) {
    // If execute_sql RPC doesn't exist, try exec_sql
    const { data: tables2, error: tablesError2 } = await supabase
      .rpc('exec_sql', { query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" });
    if (tablesError2) {
      console.log("Could not query tables listing:", tablesError2);
    } else {
      console.log("Tables in public schema:", tables2);
    }
  } else {
    console.log("Tables in public schema:", tables);
  }
}

run();
