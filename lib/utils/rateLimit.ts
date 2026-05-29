import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitWindow = Parameters<typeof Ratelimit.fixedWindow>[1];

const limiterCache = new Map<string, Ratelimit>();
let redis: Redis | null = null;

const getRedisClient = () => {
  if (!redis) {
    redis = Redis.fromEnv();
  }

  return redis;
};

export const getRateLimiter = (identifier: string, requests: number, window: RateLimitWindow) => {
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