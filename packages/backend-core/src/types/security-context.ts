import { z } from 'zod';

export const SecurityContextSchema = z.object({
  tenantId: z.string().uuid({ message: 'Invalid tenant UUID' }),
  userId: z.string().uuid({ message: 'Invalid user UUID' }),
  role: z.enum(['owner', 'admin', 'member', 'read_only', 'teacher', 'student', 'secretary']).default('member'),
  traceId: z.string().optional(),
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;
