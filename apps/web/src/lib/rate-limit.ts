import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (ratelimit) {
    return ratelimit;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  });

  return ratelimit;
}

export async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const limiter = getRatelimit();
    const result = await limiter.limit(identifier);
    return result.success;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open: allow request if rate limit service is down
    return true;
  }
}

// Stricter rate limiter: 1 request per day (for sensitive one-off actions)
let dailyRatelimit: Ratelimit | null = null;

function getDailyRatelimit(): Ratelimit {
  if (dailyRatelimit) return dailyRatelimit;

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });

  dailyRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, '1 d'), // 1 request per day
    prefix: 'ratelimit:daily',
  });

  return dailyRatelimit;
}

export async function checkDailyRateLimit(identifier: string): Promise<boolean> {
  try {
    const limiter = getDailyRatelimit();
    const result = await limiter.limit(identifier);
    return result.success;
  } catch (error) {
    console.error('Daily rate limit check failed:', error);
    return true; // fail open
  }
}

export async function getRateLimitInfo(identifier: string) {
  try {
    const limiter = getRatelimit();
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Failed to get rate limit info:', error);
    return {
      success: true,
      remaining: 10,
      reset: 0,
    };
  }
}
