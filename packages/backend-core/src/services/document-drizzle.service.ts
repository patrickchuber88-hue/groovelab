import { eq, desc } from 'drizzle-orm';
import { withDrizzleTenant } from '../db/drizzle-tenant';
import { documents } from '../db/schema';
import { SecurityContext } from '../types/security-context';

export async function getDocuments(context: SecurityContext) {
  return await withDrizzleTenant(context, async (tx) => {
    return await tx.query.documents.findMany({
      orderBy: [desc(documents.createdAt)],
    });
  });
}

export async function createDocument(
  context: SecurityContext,
  data: { title: string; content?: string; isConfidential?: boolean }
) {
  return await withDrizzleTenant(context, async (tx) => {
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
  return await withDrizzleTenant(context, async (tx) => {
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
