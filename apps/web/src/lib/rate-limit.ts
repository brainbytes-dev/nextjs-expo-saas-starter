import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { DEMO_MODE } from '@/lib/demo-mode';

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
  if (DEMO_MODE) return true;
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

export async function getRateLimitInfo(identifier: string) {
  if (DEMO_MODE) return { success: true, remaining: 10, reset: 0 };
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
