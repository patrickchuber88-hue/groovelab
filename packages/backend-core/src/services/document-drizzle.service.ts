import { eq, desc } from 'drizzle-orm';
import { withDrizzleTenant, type DrizzleTransaction } from '../db/drizzle-tenant.js';
import { documents } from '../db/schema.js';
import { SecurityContext } from '../types/security-context.js';

export async function getDocuments(context: SecurityContext) {
  return await withDrizzleTenant(context, async (tx: any) => {
    return await tx.query.documents.findMany({
      orderBy: [desc(documents.createdAt)],
    });
  });
}

export async function createDocument(
  context: SecurityContext,
  data: { title: string; content?: string; isConfidential?: boolean }
) {
  return await withDrizzleTenant(context, async (tx: any) => {
    const [newDoc] = await tx
      .insert(documents)
      .values({
        tenantId: context.tenantId, 
        ownerId: context.userId,
        title: data.title,
        content: data.content ?? null,
        isConfidential: data.isConfidential ?? false,
      })
      .returning();

    return newDoc;
  });
}

export async function deleteDocument(context: SecurityContext, documentId: string) {
  return await withDrizzleTenant(context, async (tx: any) => {
    const result = await tx
      .delete(documents)
      .where(eq(documents.id, documentId))
      .returning({ id: documents.id });

    if (result.length === 0) {
      throw new Error('Document not found or unauthorized');
    }

    return result[0];
  });
}
