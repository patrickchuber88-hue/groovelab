import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';
import { SecurityContext, SecurityContextSchema } from '../types/security-context.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

// Typ-Definition für den Drizzle-Transaktions-Client
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Führt eine Drizzle-Transaktion mit isoliertem RLS-Mandantenkontext aus.
 * 
 * @param context - Validierter Sicherheitskontext (tenantId, userId, role)
 * @param callback - Asynchrone Funktion mit Zugriff auf die isolierte Transaktion
 */
export async function withDrizzleTenant<T>(
  context: SecurityContext,
  callback: (tx: DrizzleTransaction) => Promise<T>
): Promise<T> {
  // 1. Fail-Closed Validation
  const validatedContext = SecurityContextSchema.parse(context);

  // 2. Transaktion starten
  return await db.transaction(async (tx) => {
    // 3. Postgres Session-Kontext (is_local = true implizit durch unsere Stored Procedure)
    await tx.execute(sql`
      SELECT set_app_context(
        ${validatedContext.tenantId}::uuid,
        ${validatedContext.userId}::uuid,
        ${validatedContext.role}::text
      );
    `);

    // 4. Geschäftslogik mit RLS-geschütztem tx ausführen
    return await callback(tx);
  });
}
