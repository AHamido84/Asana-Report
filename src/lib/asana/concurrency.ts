import "server-only";

/**
 * Runs `fn` over `items` with at most `limit` in flight at once. Used for
 * per-task requests (e.g. attachment counts) that have no bulk endpoint, so
 * a large project doesn't fire hundreds of simultaneous requests at Asana.
 * A single item's rejection is isolated by the caller (`fn` should catch its
 * own errors) — this helper does not stop the pool on a single failure.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
