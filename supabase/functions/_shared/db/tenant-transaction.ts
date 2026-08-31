/**
 * 🛡️ Tier-1 Enterprise Transaction Wrapper (Deno / Supabase Edge Functions)
 * Adaption of the Kysely/Pg Node.js Backend pattern for Supabase Edge Functions.
 * Guarantees zero connection-pool leakage and enforces RLS in Service-Role contexts.
 */
import postgres from "https://deno.land/x/postgresjs@v3.3.4/mod.js";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const SecurityContextSchema = z.object({
  tenantId: z.string().uuid({ message: 'Invalid tenant UUID' }),
  userId: z.string().uuid({ message: 'Invalid user UUID' }),
  role: z.enum(['owner', 'admin', 'teacher', 'student', 'secretary', 'member']).default('member'),
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

// Initialize Postgres.js connection pool for Edge Functions
// Uses SUPABASE_DB_URL which connects directly to the DB or PgBouncer
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 5 });

/**
 * Executes a database callback inside an isolated transaction with 
 * local Tenant- & User-Context enforced.
 */
export async function withTenantTransaction<T>(
  context: SecurityContext,
  callback: (trx: postgres.Sql) => Promise<T>
): Promise<T> {
  // 1. Pre-flight Validation (Fail-Closed)
  const validated = SecurityContextSchema.parse(context);

  // 2. Open isolated transaction
  return await sql.begin(async (trx) => {
    
    // 3. Set RLS context (is_local = true strictly enforced by the backend function)
    await trx`
      SELECT set_app_context(
        ${validated.tenantId}::uuid, 
        ${validated.userId}::uuid, 
        ${validated.role}::text
      );
    `;

    // 4. Execute business logic
    // The query execution here is natively protected by the Postgres Kernel RLS
    return await callback(trx);
  });
}
