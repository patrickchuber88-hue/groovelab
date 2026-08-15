/**
 * Resilient Batch Operations Engine for Campus-Groovelab Enterprise
 * 
 * Provides ACID-like protection for client-side batch mutations:
 * 1. Chunked execution to prevent HTTP gateway/browser timeouts.
 * 2. Automatic exponential backoff retry on transient network failures.
 * 3. Rollback compensation tracking: Reverts partial changes if a critical batch fails.
 * 4. Real-time progress telemetry callbacks.
 */

export interface BatchProgress<T> {
  completed: number;
  total: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  currentItem?: T;
}

export interface BatchResult<T, R> {
  success: boolean;
  results: R[];
  failedItems: { item: T; index: number; error: any }[];
  rolledBack: boolean;
  durationMs: number;
}

export interface BatchOptions<T, R> {
  chunkSize?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  abortOnFirstError?: boolean;
  rollbackOnAbort?: boolean;
  onProgress?: (progress: BatchProgress<T>) => void;
  compensate?: (item: T, partialResult?: R) => Promise<void>;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a batch of operations resiliently with retries, chunking, and optional rollback.
 */
export async function executeResilientBatch<T, R = any>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  options: BatchOptions<T, R> = {}
): Promise<BatchResult<T, R>> {
  const startTime = Date.now();
  const chunkSize = options.chunkSize || 10;
  const maxRetries = options.maxRetries || 3;
  const initialDelayMs = options.initialDelayMs || 400;
  const abortOnFirstError = options.abortOnFirstError ?? true;
  const rollbackOnAbort = options.rollbackOnAbort ?? true;

  const total = items.length;
  const totalChunks = Math.ceil(total / chunkSize);
  const results: R[] = [];
  const processedItems: { item: T; result: R }[] = [];
  const failedItems: { item: T; index: number; error: any }[] = [];

  let isAborted = false;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    if (isAborted) break;

    const start = chunkIdx * chunkSize;
    const end = Math.min(start + chunkSize, total);
    const chunk = items.slice(start, end);

    for (let i = 0; i < chunk.length; i++) {
      const itemIndex = start + i;
      const item = chunk[i];
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      let itemResult: R | undefined;

      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          itemResult = await operation(item, itemIndex);
          success = true;
          results.push(itemResult);
          processedItems.push({ item, result: itemResult });
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            // Exponential backoff with jitter
            const backoffTime = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
            console.warn(`[BatchEngine] Item ${itemIndex + 1}/${total} failed (Attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(backoffTime)}ms...`, err);
            await wait(backoffTime);
          }
        }
      }

      if (!success) {
        failedItems.push({ item, index: itemIndex, error: lastError });
        if (abortOnFirstError) {
          isAborted = true;
          break;
        }
      }

      if (options.onProgress) {
        options.onProgress({
          completed: results.length + failedItems.length,
          total,
          percent: Math.round(((results.length + failedItems.length) / total) * 100),
          currentChunk: chunkIdx + 1,
          totalChunks,
          currentItem: item
        });
      }
    }
  }

  let rolledBack = false;

  // Perform Rollback if aborted and compensation handler is provided
  if (isAborted && rollbackOnAbort && options.compensate && processedItems.length > 0) {
    console.warn(`[BatchEngine] Critical batch failure detected. Rolling back ${processedItems.length} completed operations...`);
    rolledBack = true;

    // Rollback in reverse order
    for (let j = processedItems.length - 1; j >= 0; j--) {
      try {
        await options.compensate(processedItems[j].item, processedItems[j].result);
      } catch (rollbackErr) {
        console.error(`[BatchEngine] Rollback compensation failed for item:`, processedItems[j].item, rollbackErr);
      }
    }
  }

  return {
    success: failedItems.length === 0,
    results,
    failedItems,
    rolledBack,
    durationMs: Date.now() - startTime
  };
}
