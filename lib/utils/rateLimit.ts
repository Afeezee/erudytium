import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitWindow = Parameters<typeof Ratelimit.fixedWindow>[1];

const limiterCache = new Map<string, Ratelimit>();
let redis: Redis | null = null;

const hasConfiguredUpstash = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return false;
  }

  return !url.includes("replace-with") && !token.includes("replace-with");
};

const getRedisClient = () => {
  if (!redis) {
    redis = Redis.fromEnv();
  }

  return redis;
};

export const getRateLimiter = (identifier: string, requests: number, window: RateLimitWindow) => {
  if (!hasConfiguredUpstash()) {
    return {
      // Fail-open in local/dev when Upstash is not configured.
      limit: async () => ({ success: true, limit: requests, remaining: requests, reset: Date.now() + 60_000, pending: Promise.resolve() })
    };
  }

  const cacheKey = `${identifier}:${requests}:${window}`;

  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.fixedWindow(requests, window),
        analytics: true,
        prefix: `erudytium:${identifier}`
      })
    );
  }

  const ratelimit = limiterCache.get(cacheKey)!;

  return {
    limit: async (subject: string) => ratelimit.limit(subject)
  };
};