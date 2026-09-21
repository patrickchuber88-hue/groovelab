import { Pool, PoolClient } from 'pg';
import { SecurityContext, SecurityContextSchema } from '../types/security-context.js';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Führt einen DB-Callback innerhalb einer isolierten Transaktion mit gesetztem
 * Tenant- & User-Kontext aus.
 */
export async function withTenantTransaction<T>(
  context: SecurityContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const validatedContext = SecurityContextSchema.parse(context);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT set_app_context($1::uuid, $2::uuid, $3::text);`,
      [validatedContext.tenantId, validatedContext.userId, validatedContext.role]
    );

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
