import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const masterClient = createClient(supabaseUrl, serviceKey);

async function main() {
  const testSchoolId = crypto.randomUUID();
  const teacherId = crypto.randomUUID();

  // Create school
  await masterClient.from('schools').insert({ id: testSchoolId, name: 'Test School RLS' });
  // Create teacher
  await masterClient.from('users_raw').insert([
    { id: teacherId, school_id: testSchoolId, role: 'teacher', first_name: 'John', last_name: 'Doe', roles: ['teacher'], is_active: true, is_campus_active: true, is_groovelab_active: true }
  ]);

  const teacherClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('x-user-id', teacherId);
        headers.set('x-invite-school-id', testSchoolId);
        return fetch(input, { ...init, headers });
      }
    }
  });

  const { data, error } = await teacherClient
    .from('schools')
    .update({ student_billing_option: 'unauthorized_option' })
    .eq('id', testSchoolId)
    .select();

  console.log('Update Result:', { data, error });

  // Cleanup
  await masterClient.from('users_raw').delete().eq('school_id', testSchoolId);
  await masterClient.from('schools').delete().eq('id', testSchoolId);
}

main();
