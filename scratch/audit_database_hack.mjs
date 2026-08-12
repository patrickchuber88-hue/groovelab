import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function executeSqlDiagnostic(sqlQuery) {
  const wrappedSql = `
    DO $$
    DECLARE
      val json;
    BEGIN
      SELECT json_agg(r) INTO val FROM (
        ${sqlQuery}
      ) r;
      RAISE EXCEPTION 'DIAGNOSTIC_JSON:%', val::text;
    END $$;
  `;

  const { error } = await supabase.rpc('execute_sql', { sql_query: wrappedSql });
  if (error && error.message) {
    const match = error.message.match(/DIAGNOSTIC_JSON:(.*)/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        console.error("Failed to parse diagnostic JSON:", err.message);
        console.error("Raw string length:", match[1].length);
        console.error("Raw string preview:", match[1].substring(0, 200));
      }
    } else {
      console.error("SQL Error (No diagnostic JSON):", error.message);
    }
  } else {
    console.error("Expected exception but got success or empty error:", error);
  }
  return null;
}

async function run() {
  console.log("=== DB AUDIT: RLS & Policies Status ===");

  // 1. RLS disabled tables
  const rlsDisabledQuery = `
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
    ORDER BY table_name
  `;

  const rlsDisabledData = await executeSqlDiagnostic(rlsDisabledQuery);
  if (rlsDisabledData) {
    console.log("\n⚠️ TABLES WITH RLS DISABLED (CRITICAL):");
    console.table(rlsDisabledData);
  }

  // 2. RLS enabled tables
  const rlsEnabledQuery = `
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY table_name
  `;

  const rlsEnabledData = await executeSqlDiagnostic(rlsEnabledQuery);
  if (rlsEnabledData) {
    console.log("\n✅ TABLES WITH RLS ENABLED:");
    console.log(rlsEnabledData.map(t => t.table_name).join(", "));
  }

  // 3. Let's query policies for specific tables to avoid truncation: users, schools, bands, band_members, sessions
  const targetTables = ['users', 'schools', 'sessions', 'schedules', 'bands', 'band_members'];
  console.log("\n=== POLICIES FOR TARGET TABLES ===");
  for (const table of targetTables) {
    const policyQuery = `
      SELECT 
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = '${table}'
      ORDER BY policyname
    `;
    const pols = await executeSqlDiagnostic(policyQuery);
    if (pols) {
      console.log(`\nPolicies on [${table}]:`);
      console.table(pols.map(p => ({
        policy: p.policyname,
        cmd: p.cmd,
        roles: JSON.stringify(p.roles),
        qual: p.qual ? p.qual.substring(0, 100) : null,
        with_check: p.with_check ? p.with_check.substring(0, 100) : null
      })));
    }
  }
}

run().catch(console.error);
