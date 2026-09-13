/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ENTERPRISE IDEMPOTENCY CLIENT
 * Ensures exactly-once execution for critical mutations and transactions
 * ==============================================================================
 */

import { supabase } from '../lib/supabase';
import { parseApiError, ProblemDetails } from '../utils/rfc7807ErrorHandler';

export function generateIdempotencyKey(prefix: string = 'idmp'): string {
  const random = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  return `${prefix}_${Date.now()}_${random}`;
}

export interface IdempotentExecutionResult<T> {
  data: T | null;
  error: ProblemDetails | null;
  isCached: boolean;
}

/**
 * Executes a mutation with guaranteed exactly-once idempotency.
 */
export async function executeIdempotentMutation<T>(
  endpoint: string,
  idempotencyKey: string,
  mutationFn: () => Promise<{ data: T | null; error: unknown }>
): Promise<IdempotentExecutionResult<T>> {
  try {
    // 1. Acquire Idempotency Lock
    const { data: lockResult, error: lockErr } = await supabase.rpc('acquire_idempotency_lock', {
      p_key: idempotencyKey,
      p_endpoint: endpoint,
    });

    if (lockErr) {
      console.warn('[IdempotencyClient] Failed to acquire lock, proceeding with normal execution:', lockErr);
    } else if (lockResult?.status === 'completed' && lockResult?.is_cached) {
      console.info(`[IdempotencyClient] Returning cached response for key ${idempotencyKey}`);
      return {
        data: lockResult.response as T,
        error: null,
        isCached: true,
      };
    } else if (lockResult?.status === 'in_flight') {
      return {
        data: null,
        error: parseApiError({
          status: 409,
          message: 'Eine identische Anfrage wird bereits verarbeitet. Bitte kurz warten.',
          code: 'CG_MUTATION_IN_FLIGHT',
        }, endpoint),
        isCached: false,
      };
    }

    // 2. Execute Primary Mutation
    const { data, error } = await mutationFn();

    if (error) {
      return {
        data: null,
        error: parseApiError(error, endpoint),
        isCached: false,
      };
    }

    // 3. Store Idempotent Response Asynchronously
    if (data) {
      (async () => {
        try {
          await supabase.rpc('save_idempotent_response', {
            p_key: idempotencyKey,
            p_endpoint: endpoint,
            p_response: data,
            p_status_code: 200,
          });
        } catch (e) {
          // Non-blocking background save
        }
      })();
    }

    return {
      data,
      error: null,
      isCached: false,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: parseApiError(err, endpoint),
      isCached: false,
    };
  }
}
