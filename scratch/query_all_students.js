const url = 'https://supabase.campus-groovelab.de';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

async function run() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'x-client-info': `supabase-js/2.39.3;user_id=13e8fac6-8e6c-47e2-93b3-f2f9888a5626`
  };

  const resUsers = await fetch(`${url}/rest/v1/users?role=eq.student&select=id,first_name,last_name,qr_token`, { headers });
  const students = await resUsers.json();
  console.log('Students:', students);

  for (const s of students) {
    console.log(`\n--- Student: ${s.first_name} ${s.last_name} (${s.id}) ---`);
    const resStats = await fetch(`${url}/rest/v1/student_stats?student_id=eq.${s.id}&select=*`, { headers });
    console.log('Stats:', await resStats.json());

    const resAvatars = await fetch(`${url}/rest/v1/avatars?user_id=eq.${s.id}&select=*`, { headers });
    console.log('Avatars:', await resAvatars.json());

    const resLogs = await fetch(`${url}/rest/v1/fokus_logs?user_id=eq.${s.id}&select=*&order=created_at.desc`, { headers });
    console.log('Logs:', await resLogs.json());
  }
}

run().catch(console.error);
