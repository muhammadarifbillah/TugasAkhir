/**
 * In-memory sliding-window rate limiter.
 * Supports both user-based and IP-based rate limiting.
 * NOTE: in-memory only — reset on process restart and not shared across
 * multiple server instances. Suitable for single-instance deployment.
 */
const buckets = new Map<
  string,
  { hits: number[]; limit: number; windowMs: number }
>();

/** Stale buckets (no activity for 10 minutes) are pruned on every call. */
const STALE_MS = 10 * 60 * 1000;

function getOrCreateBucket(
  key: string,
  limit: number,
  windowMs: number,
): { hits: number[]; limit: number; windowMs: number } {
  let bucket = buckets.get(key);
  if (!bucket || bucket.limit !== limit || bucket.windowMs !== windowMs) {
    bucket = { hits: [], limit, windowMs };
    buckets.set(key, bucket);
  }
  return bucket;
}

function cleanup() {
  const now = Date.now();
  if (buckets.size > 500) {
    for (const [k, b] of buckets) {
      const last = b.hits[b.hits.length - 1];
      if (!last || now - last > STALE_MS) buckets.delete(k);
    }
  }
}

/**
 * Rate limit check by user id.
 * @returns true if rate limit exceeded
 */
export function rateLimited(
  key: string,
  limit = 20,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const bucket = getOrCreateBucket(key, limit, windowMs);
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    return true;
  }

  bucket.hits.push(now);
  cleanup();
  return false;
}

/**
 * Rate limit check by IP address (for unauthenticated endpoints).
 * @returns true if rate limit exceeded
 */
export function rateLimitedByIp(
  ip: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  return rateLimited(`ip:${ip}`, limit, windowMs);
}

/**
 * Get remaining requests for a key.
 * Returns the number of requests remaining in the current window.
 */
export function getRemainingRequests(
  key: string,
  limit = 20,
  windowMs = 60_000,
): number {
  const now = Date.now();
  const bucket = getOrCreateBucket(key, limit, windowMs);
  const validHits = bucket.hits.filter((t) => now - t < windowMs);
  return Math.max(0, limit - validHits.length);
}
