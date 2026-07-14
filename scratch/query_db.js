const url = 'https://supabase.campus-groovelab.de';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const bypassTokens = [
  'd02ca7d9-70d6-437f-900a-94aa062fe960',
  '35510b16-7044-4a05-8987-ef6dd8dbbb04',
  '13e8fac6-8e6c-47e2-93b3-f2f9888a5626'
];

async function run() {
  for (const token of bypassTokens) {
    console.log(`\n=== Testing Token: ${token} ===`);
    
    // We try to query users by adding it to x-client-info
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'x-client-info': `supabase-js/2.39.3;user_id=${token};qr_token=${token}`
    };

    const resUsers = await fetch(`${url}/rest/v1/users?select=id,first_name,last_name,role,qr_token`, { headers });
    const users = await resUsers.json();
    console.log('Users found:', users);

    if (users && users.length > 0) {
      const u = users[0];
      const resStats = await fetch(`${url}/rest/v1/student_stats?student_id=eq.${u.id}&select=*`, { headers });
      console.log('Stats:', await resStats.json());

      const resAvatars = await fetch(`${url}/rest/v1/avatars?user_id=eq.${u.id}&select=*`, { headers });
      console.log('Avatars:', await resAvatars.json());

      const resLogs = await fetch(`${url}/rest/v1/fokus_logs?user_id=eq.${u.id}&select=*&order=created_at.desc&limit=5`, { headers });
      console.log('Logs:', await resLogs.json());
    }
  }
}

run().catch(console.error);
