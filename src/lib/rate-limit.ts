import { LRUCache } from 'lru-cache';

export interface RateLimitOptions {
  interval: number; // milliseconds
  limit: number; // max requests per interval
  uniqueTokenPerInterval: number; // max unique tokens per interval
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRUCache<string, number>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit: number, token: string): Promise<void> => {
      const tokenCount = (tokenCache.get(token) as number) || 0;
      
      if (tokenCount >= limit) {
        return Promise.reject(new Error('Rate limit exceeded'));
      }
      
      tokenCache.set(token, tokenCount + 1);
      return Promise.resolve();
    },
  };
}
