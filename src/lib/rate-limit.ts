const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;
const CLEANUP_INTERVAL_MS = 120_000; // 2 minutes

const store = new Map<string, number[]>();
let lastCleanup = Date.now();

function cleanup(now: number) {
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, valid);
    }
  }
  lastCleanup = now;
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanup(now);
  }

  const timestamps = store.get(key) ?? [];
  const windowTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (windowTimestamps.length >= MAX_REQUESTS) {
    store.set(key, windowTimestamps);
    return false;
  }

  windowTimestamps.push(now);
  store.set(key, windowTimestamps);
  return true;
}

/** Exposed for testing only */
export function _getStore(): Map<string, number[]> {
  return store;
}
