import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

// Secretary user ID from previous query: Manuel Wagner
const SECRETARY_USER_ID = '330bd062-e86a-4cb2-aa8d-056c72351e95';
const SCHOOL_ID = 'a3c4dfb7-d35a-4522-a951-cb373f79915f';

// Custom fetch wrapper to inject headers exactly like apps/groovelab/src/lib/supabase.ts
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers);
  headers.set('x-user-id', SECRETARY_USER_ID);
  
  return await fetch(input, {
    ...init,
    headers
  });
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: customFetch
    }
  }
);

async function run() {
  const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
  const qrToken = 't_' + Math.random().toString(36).substring(2, 12);

  console.log("Simulating teacher import insertion by Secretary (Manuel Wagner)...");
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      school_id: SCHOOL_ID,
      role: 'teacher',
      first_name: 'Patrick',
      last_name: 'Huber',
      email: 'patrick.huber@musaek.de',
      instrument: 'Gitarre',
      max_students: 10,
      ausweis_nummer: pin,
      teacher_qr_token: qrToken,
      is_active: false,
      is_app_user: false,
      is_campus_active: true,
      is_groovelab_active: false
    })
    .select();

  if (error) {
    console.error('INSERT FAILED WITH ERROR:', error);
  } else {
    console.log('INSERT SUCCESSFUL:', data);
    // Cleanup
    await supabase.from('users').delete().eq('id', data[0].id);
    console.log('Cleanup successful');
  }
}
run();
