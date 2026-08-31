/**
 * 🛡️ Tier-1 Enterprise Logger & TraceID Generator
 * Prevents PII leaks and provides non-sensitive Correlation IDs to the client.
 */

export function generateTraceId(): string {
  // Generates a simple, unique ID like ERR-A1B2-C3D4
  const randomHex = () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
  return `ERR-${randomHex()}-${randomHex()}`;
}

export class EnterpriseLogger {
  static error(context: string, error: any, tenantId?: string) {
    const traceId = generateTraceId();
    
    // Server-side / Console structured logging (Masking could be applied here)
    console.error(JSON.stringify({
      level: "ERROR",
      traceId,
      context,
      tenantId: tenantId || "UNKNOWN",
      message: error?.message || error,
      timestamp: new Date().toISOString()
      // Note: Stack traces are kept internal
    }));

    // Return a safe error response for the UI
    return {
      error: "InternalServerError",
      message: "An unexpected system error occurred. Please contact support.",
      traceId
    };
  }

  static audit(action: string, actorId: string, resource: string) {
    console.log(JSON.stringify({
      level: "AUDIT",
      action,
      actorId,
      resource,
      timestamp: new Date().toISOString()
    }));
  }
}
