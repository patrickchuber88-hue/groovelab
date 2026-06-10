const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const actualAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3Zk5b.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const realAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3Zk5b.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc'; // Wait, let's use the actual key
const actualAnonKeyNew = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const userId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725'; // Manuel Wagner (Admin)

const supabase = createClient(supabaseUrl, actualAnonKeyNew, {
  global: {
    headers: {
      'x-user-id': userId
    }
  }
});

async function testAuditLogs() {
  console.log(`Fetching audit logs as User ${userId} (Manuel Wagner, Admin)...`);
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        changed_by,
        table_name,
        action,
        record_id,
        old_data,
        new_data,
        created_at,
        users (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }
    
    console.log(`Fetched ${data ? data.length : 0} logs.`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Execution error:', err);
  }
}

testAuditLogs();
