import { PostHog } from 'posthog-node';
import posthog from 'posthog-js';

let serverClient: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (serverClient) {
    return serverClient;
  }

  serverClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    flushInterval: 10000,
  });

  return serverClient;
}

export function initPostHogClient() {
  if (typeof window === 'undefined') {
    return;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });
}

export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
) {
  const client = getPostHogServer();
  client.capture({
    distinctId,
    event,
    properties,
  });
}

export { posthog };
