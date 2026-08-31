import { withKyselyTenant } from '../db/kysely-tenant';
import { SecurityContext } from '../types/security-context';

export async function getTenantDocuments(context: SecurityContext) {
  return await withKyselyTenant(context, async (trx) => {
    return await trx
      .selectFrom('documents')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  });
}

export async function createTenantDocument(
  context: SecurityContext,
  input: { title: string; content: string; isConfidential?: boolean }
) {
  return await withKyselyTenant(context, async (trx) => {
    return await trx
      .insertInto('documents')
      .values({
        id: crypto.randomUUID(),
        tenant_id: context.tenantId,
        owner_id: context.userId,
        title: input.title,
        content: input.content,
        is_confidential: input.isConfidential ?? false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  });
}
