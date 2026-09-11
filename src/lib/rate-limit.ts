/**
 * In-memory sliding-window rate limiter.
 * Supports both user-based and IP-based rate limiting.
 *
 * NOTE: in-memory only — reset on process restart and not shared across multiple
 * server instances. Suitable for single-instance deployment; move the buckets to
 * Redis for a multi-instance deployment.
 */
interface Bucket {
  hits: number[];
  limit: number;
  windowMs: number;
}

/**
 * Buckets are keyed by scope AND limit/window. Keying by scope alone meant that
 * calling the same scope with a different limit reset the bucket and discarded
 * its history — which let a caller evade the tighter limit.
 */
const buckets = new Map<string, Bucket>();

/** Stale buckets (no activity for 10 minutes) are pruned periodically. */
const STALE_MS = 10 * 60 * 1000;

function bucketId(key: string, limit: number, windowMs: number): string {
  return `${key}|${limit}|${windowMs}`;
}

function cleanup(now: number) {
  for (const [id, bucket] of buckets) {
    const last = bucket.hits[bucket.hits.length - 1];
    if (!last || now - last > STALE_MS) buckets.delete(id);
  }
}

/**
 * Rate limit check by scope key.
 * @returns true if the rate limit is exceeded
 */
export function rateLimited(
  key: string,
  limit = 20,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const id = bucketId(key, limit, windowMs);

  let bucket = buckets.get(id);
  if (!bucket) {
    bucket = { hits: [], limit, windowMs };
    buckets.set(id, bucket);
    // Keep the map bounded without relying on an arbitrary size threshold.
    if (buckets.size > 500) cleanup(now);
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    return true;
  }

  bucket.hits.push(now);
  return false;
}

/**
 * Rate limit check by IP address (for unauthenticated endpoints).
 * @returns true if the rate limit is exceeded
 */
export function rateLimitedByIp(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  return rateLimited(`ip:${key}`, limit, windowMs);
}

/**
 * Applies several limits at once and reports whether ANY of them is exceeded.
 * Useful when a single request must respect both a per-user and a per-IP budget.
 */
export function rateLimitedAny(
  checks: { key: string; limit: number; windowMs?: number }[],
): boolean {
  let exceeded = false;
  for (const check of checks) {
    // Evaluate every check so each bucket records the hit.
    if (rateLimited(check.key, check.limit, check.windowMs ?? 60_000)) {
      exceeded = true;
    }
  }
  return exceeded;
}

/**
 * Get remaining requests for a key.
 */
export function getRemainingRequests(
  key: string,
  limit = 20,
  windowMs = 60_000,
): number {
  const now = Date.now();
  const bucket = buckets.get(bucketId(key, limit, windowMs));
  if (!bucket) return limit;
  const validHits = bucket.hits.filter((t) => now - t < windowMs);
  return Math.max(0, limit - validHits.length);
}
