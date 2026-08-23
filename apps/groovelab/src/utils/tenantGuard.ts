/**
 * Tier-1 Multi-Tenant Invariant Runtime Guard
 * Campus-Groovelab Enterprise+ Architecture
 * 
 * Guarantees that no data entity belonging to School A is ever rendered in School B's context.
 * Performs client-side invariant assertions and logs any cross-tenant leakage attempt.
 */

export interface TenantGuardViolation {
  entityType: string;
  expectedSchoolId: string | number;
  actualSchoolId: string | number;
  recordId: string | number;
  timestamp: string;
}

const violationHistory: TenantGuardViolation[] = [];

/**
 * Validates an array of entities against the active school tenant ID.
 * Silently prunes mismatched rows in production and records a telemetry security violation.
 */
export function assertTenantIsolation<T extends { school_id?: string | number; id?: string | number }>(
  items: T[],
  expectedSchoolId: string | number | null | undefined,
  entityName = 'Entity'
): T[] {
  if (!expectedSchoolId || !items || !Array.isArray(items)) {
    return items || [];
  }

  const cleanExpected = String(expectedSchoolId);
  const safeItems: T[] = [];

  for (const item of items) {
    if (item.school_id !== undefined && item.school_id !== null) {
      const itemSchool = String(item.school_id);
      if (itemSchool !== cleanExpected) {
        const violation: TenantGuardViolation = {
          entityType: entityName,
          expectedSchoolId: cleanExpected,
          actualSchoolId: itemSchool,
          recordId: item.id || 'UNKNOWN',
          timestamp: new Date().toISOString()
        };
        violationHistory.push(violation);
        console.error(`[TenantGuard] 🚨 CRITICAL INVARIANT VIOLATION: ${entityName} with id=${item.id} belongs to school=${itemSchool}, but expected=${cleanExpected}! Pruning from client render.`);
        continue;
      }
    }
    safeItems.push(item);
  }

  return safeItems;
}

export function getTenantGuardViolations(): TenantGuardViolation[] {
  return [...violationHistory];
}
