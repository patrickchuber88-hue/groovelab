import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { SecurityContext, SecurityContextSchema } from '../types/security-context';

export interface DocumentsTable {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  content: string | null;
  is_confidential: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Database {
  documents: DocumentsTable;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

/**
 * Kysely-spezifischer RLS-Wrapper
 */
export async function withKyselyTenant<T>(
  context: SecurityContext,
  callback: (trx: Kysely<Database>) => Promise<T>
): Promise<T> {
  const validatedContext = SecurityContextSchema.parse(context);

  return await db.transaction().execute(async (trx) => {
    await sql`
      SELECT set_app_context(
        ${validatedContext.tenantId}::uuid,
        ${validatedContext.userId}::uuid,
        ${validatedContext.role}::text
      );
    `.execute(trx);

    return await callback(trx);
  });
}
