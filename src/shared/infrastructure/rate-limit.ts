// Rate-limit store abstraction.
// Default: in-memory (single instance). For multi-server, set
// RATE_LIMIT_STORE=redis and provide a RedisRateLimitStore implementation
// (not bundled yet; requires `redis`/`ioredis` approval + dependency).
// Contract: increment(key, windowMs, max) returns { allowed, retryAfterSeconds }.

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number, max: number): RateLimitResult;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, { count: number; reset: number }>();

  increment(key: string, windowMs: number, max: number): RateLimitResult {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || now > entry.reset) {
      this.hits.set(key, { count: 1, reset: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    if (entry.count <= max) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.reset - now) / 1000),
    };
  }
}

let store: RateLimitStore = new InMemoryRateLimitStore();

export function getRateLimitStore(): RateLimitStore {
  return store;
}

export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export function createRateLimitStoreFromEnv(): RateLimitStore {
  // Only in-memory is bundled. Redis/external stores plug in here once the
  // dependency is approved and installed.
  const kind = (process.env.RATE_LIMIT_STORE ?? "memory").toLowerCase();
  if (kind === "memory" || kind === "") return new InMemoryRateLimitStore();
  // Unknown kinds fall back to memory rather than failing closed; operators must
  // verify the chosen store is actually wired before relying on it.
  return new InMemoryRateLimitStore();
}