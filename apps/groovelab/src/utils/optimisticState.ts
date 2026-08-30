/**
 * Campus-Groovelab Tier-1 FinTech Optimistic State Engine
 * Provides instant 0ms feedback with automatic rollback on network failure.
 */

export interface OptimisticActionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rolledBack?: boolean;
}

export async function executeOptimisticAction<T>(options: {
  // Optimistic client update executed immediately (0ms)
  onOptimisticApply: () => void;
  // Network/Server promise to perform real write
  action: () => Promise<T>;
  // Rollback function in case network request fails
  onRollback: (err: Error) => void;
  // Optional success callback
  onSuccess?: (data: T) => void;
}): Promise<OptimisticActionResult<T>> {
  const { onOptimisticApply, action, onRollback, onSuccess } = options;

  // 1. Instant optimistic application
  try {
    onOptimisticApply();
  } catch (err) {
    console.error('Optimistic apply error:', err);
  }

  // 2. Perform network transaction
  try {
    const data = await action();
    if (onSuccess) onSuccess(data);
    return { success: true, data };
  } catch (error: any) {
    console.warn('Network action failed, rolling back optimistic state:', error);
    try {
      onRollback(error instanceof Error ? error : new Error(String(error)));
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    return { success: false, error: error instanceof Error ? error : new Error(String(error)), rolledBack: true };
  }
}
