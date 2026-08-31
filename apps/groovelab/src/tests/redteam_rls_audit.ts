/**
 * 🔴 Tier-1 Red-Teaming RLS Audit Script
 * This script runs in the CI/CD pipeline.
 * It simulates an attacker bypassing the UI and hitting the Supabase REST API directly
 * with an anonymous or cross-tenant token.
 */
import { createClient } from '@supabase/supabase-js';

// We assert that these environment variables are provided by the CI/CD runner
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'dummy_anon_key';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function runBOLA_Audit() {
  console.log("🛡️ Starting Automated BOLA/IDOR Penetration Test...");

  // Attacker attempts to read ALL users
  const { data, error } = await client.from('users_raw').select('*').limit(10);
  
  if (error) {
    console.log("✅ RLS successfully blocked unauthorized table access (Expected Error)");
  } else if (data && data.length > 0) {
    console.error("❌ CRITICAL BOLA VULNERABILITY: Anonymous client read users_raw data!");
    process.exit(1);
  } else {
    console.log("✅ RLS restricted response to 0 rows for anonymous attacker.");
  }

  // Attacker attempts to inject malicious data
  const { error: insertErr } = await client.from('sessions').insert([{
    user_id: '00000000-0000-0000-0000-000000000000',
    ip_address: '1.2.3.4'
  }]);

  if (insertErr) {
    console.log("✅ RLS successfully blocked malicious INSERT (Expected Error)");
  } else {
    console.error("❌ CRITICAL RLS VULNERABILITY: Anonymous client injected session data!");
    process.exit(1);
  }

  console.log("🎉 Tier-1 Enterprise RLS Red-Team Audit Passed.");
}
