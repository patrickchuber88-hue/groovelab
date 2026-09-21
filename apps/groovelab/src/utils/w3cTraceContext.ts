/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: W3C DISTRIBUTED TRACE CONTEXT ENGINE
 * ==============================================================================
 * Standard: W3C Trace Context Level 2 Recommendation
 * Specification: https://www.w3.org/TR/trace-context/
 * Format: 00-${traceId}-${spanId}-01 (Version 00, 32-hex Trace-ID, 16-hex Span-ID)
 * 
 * Forensic Purpose:
 * Binds client-side user interactions (React clicks, form submissions, navigation)
 * directly to PostgreSQL RPC transactions and audit logs (ISO/IEC 27037).
 * ==============================================================================
 */

export interface W3CTraceContext {
  version: string;
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
  createdAt: number;
}

// Global in-memory storage for active trace session
let activeTrace: W3CTraceContext | null = null;

/**
 * Generates cryptographically secure random hexadecimal characters.
 */
function randomHex(byteLength: number): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-WebCrypto environments
  let str = '';
  for (let i = 0; i < byteLength * 2; i++) {
    str += Math.floor(Math.random() * 16).toString(16);
  }
  return str;
}

/**
 * Formats a valid W3C traceparent string.
 */
export function formatTraceparent(traceId: string, spanId: string, flags: string = '01'): string {
  const cleanTrace = traceId.toLowerCase().padStart(32, '0').slice(0, 32);
  const cleanSpan = spanId.toLowerCase().padStart(16, '0').slice(0, 16);
  return `00-${cleanTrace}-${cleanSpan}-${flags}`;
}

/**
 * Validates whether a string conforms to the W3C traceparent standard.
 */
export function isValidTraceparent(traceparent: string): boolean {
  if (!traceparent || typeof traceparent !== 'string') return false;
  const regex = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i;
  if (!regex.test(traceparent)) return false;
  // Ensure trace_id and span_id are not all zeros
  const parts = traceparent.split('-');
  if (parts[1] === '00000000000000000000000000000000') return false;
  if (parts[2] === '0000000000000000') return false;
  return true;
}

/**
 * Parses a W3C traceparent header string into a structured context.
 */
export function parseTraceparent(traceparent: string): W3CTraceContext | null {
  if (!isValidTraceparent(traceparent)) return null;
  const [version, traceId, spanId, traceFlags] = traceparent.split('-');
  return {
    version,
    traceId,
    spanId,
    traceFlags,
    traceparent,
    createdAt: Date.now()
  };
}

/**
 * Generates a fresh W3C TraceContext with a new Trace-ID and initial Span-ID.
 */
export function generateNewTrace(flags: string = '01'): W3CTraceContext {
  const version = '00';
  let traceId = randomHex(16); // 16 bytes = 32 hex chars
  if (traceId === '00000000000000000000000000000000') {
    traceId = '1' + traceId.slice(1);
  }
  let spanId = randomHex(8);   // 8 bytes = 16 hex chars
  if (spanId === '0000000000000000') {
    spanId = '1' + spanId.slice(1);
  }
  const traceparent = formatTraceparent(traceId, spanId, flags);

  const context: W3CTraceContext = {
    version,
    traceId,
    spanId,
    traceFlags: flags,
    traceparent,
    createdAt: Date.now()
  };

  activeTrace = context;
  return context;
}

/**
 * Generates a child span under the existing active trace, or generates a new trace
 * if none exists or if the existing trace has expired (> 15 minutes of inactivity).
 */
export function startChildSpan(parentTrace?: W3CTraceContext | null): W3CTraceContext {
  const parent = parentTrace || activeTrace;
  const now = Date.now();

  // If no parent or parent is older than 15 minutes, start a new trace
  if (!parent || now - parent.createdAt > 15 * 60 * 1000) {
    return generateNewTrace();
  }

  let newSpanId = randomHex(8);
  if (newSpanId === '0000000000000000') {
    newSpanId = '1' + newSpanId.slice(1);
  }

  const childContext: W3CTraceContext = {
    version: parent.version,
    traceId: parent.traceId,
    spanId: newSpanId,
    traceFlags: parent.traceFlags,
    traceparent: formatTraceparent(parent.traceId, newSpanId, parent.traceFlags),
    createdAt: now
  };

  activeTrace = childContext;
  return childContext;
}

/**
 * Returns the currently active trace context, or lazily generates one if uninitialized.
 */
export function getOrCreateActiveTrace(): W3CTraceContext {
  if (!activeTrace || Date.now() - activeTrace.createdAt > 15 * 60 * 1000) {
    return generateNewTrace();
  }
  return activeTrace;
}
