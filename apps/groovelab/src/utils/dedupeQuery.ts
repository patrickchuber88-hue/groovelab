/**
 * In-Flight Promise Deduplication for Tier-1 SaaS Enterprise+ Architecture
 * Campus-Groovelab
 * 
 * Prevents identical concurrent queries from multiple components from firing duplicate HTTP roundtrips.
 */

const inFlightMap = new Map<string, Promise<any>>();

export function dedupeQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  if (inFlightMap.has(key)) {
    return inFlightMap.get(key) as Promise<T>;
  }

  const promise = queryFn().finally(() => {
    inFlightMap.delete(key);
  });

  inFlightMap.set(key, promise);
  return promise;
}

export function clearInFlightQueries(): void {
  inFlightMap.clear();
}
