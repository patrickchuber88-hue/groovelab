import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function simulateRegistration(subdomain: string, pin: string, suffix: string) {
  const schoolId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const qrToken = crypto.randomUUID();

  console.log(`[Simulating] Subdomain: ${subdomain}, PIN: ${pin}`);

  try {
    // 1. Insert school
    const { error: schoolErr } = await supabase
      .from('schools')
      .insert({
        id: schoolId,
        name: `Test Schule ${suffix}`,
        subdomain: subdomain,
        primary_color: '#10b981',
        street: 'Teststr.',
        house_number: '123',
        zip_code: '12345',
        city: 'Teststadt',
        phone_number: '012345678',
        email: `test-${suffix}@schule.de`,
        is_trial: true,
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trial'
      });

    if (schoolErr) {
      return { success: false, phase: 'school_insert', error: schoolErr.message };
    }

    // 2. Insert user
    const { error: userErr } = await supabase
      .from('users')
      .insert({
        id: adminId,
        school_id: schoolId,
        role: 'admin',
        first_name: 'Test',
        last_name: `Admin ${suffix}`,
        email: `${subdomain}@campus-groovelab.de`,
        password_hash: pin,
        qr_token: qrToken,
        ausweis_nummer: pin,
        is_campus_active: true,
        is_groovelab_active: true,
        is_active: true,
        roles: ['admin']
      });

    if (userErr) {
      // Clean up school to keep DB clean
      await supabase.from('schools').delete().eq('id', schoolId);
      return { success: false, phase: 'user_insert', error: userErr.message };
    }

    // Clean up created school/user for test clean state
    await supabase.from('users').delete().eq('id', adminId);
    await supabase.from('schools').delete().eq('id', schoolId);

    return { success: true };
  } catch (err: any) {
    return { success: false, phase: 'catch', error: err.message };
  }
}

async function runTests() {
  console.log("Starting Registration Stress/Härtetest...\n");

  // Test 1: Duplicate subdomain
  console.log("--- TEST 1: Duplicate Subdomain (Expect constraint failure) ---");
  const res1 = await simulateRegistration('verplant', '999999', 'dup1');
  console.log("Result 1 (verplant already exists):", res1);

  // Test 2: Duplicate PIN / ausweis_nummer
  console.log("\n--- TEST 2: Duplicate PIN / ausweis_nummer (Expect constraint failure) ---");
  // Let's get an existing ausweis_nummer first
  const { data: existingUser } = await supabase.from('users').select('ausweis_nummer').is('role', 'student').limit(1).single();
  if (existingUser && existingUser.ausweis_nummer) {
    const res2 = await simulateRegistration('unique-sub-test-1', existingUser.ausweis_nummer, 'dup2');
    console.log(`Result 2 (using existing PIN ${existingUser.ausweis_nummer}):`, res2);
  } else {
    console.log("Could not find an existing ausweis_nummer to test PIN collision.");
  }

  // Test 3: Concurrent registration (Race condition simulation)
  console.log("\n--- TEST 3: Concurrent Subdomain Registration (Race condition check) ---");
  const subdomain = 'concurrent-race-test-' + Math.floor(Math.random() * 1000);
  const p1 = simulateRegistration(subdomain, '111111', 'c1');
  const p2 = simulateRegistration(subdomain, '222222', 'c2');
  const [r1, r2] = await Promise.all([p1, p2]);
  console.log("Concurrent result 1:", r1);
  console.log("Concurrent result 2:", r2);
}

runTests();
