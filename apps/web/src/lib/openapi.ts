import { OpenApiBuilder } from 'zod-to-openapi';
import { z } from 'zod';

const builder = new OpenApiBuilder({
  title: 'SaaS API',
  version: '1.0.0',
  description: 'API documentation for SaaS platform',
});

// Auth endpoints
builder.addPath({
  path: '/api/auth/signin',
  operations: {
    post: {
      summary: 'Sign in',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully signed in',
        },
      },
    },
  },
});

builder.addPath({
  path: '/api/auth/signup',
  operations: {
    post: {
      summary: 'Create new account',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                password: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Account created successfully',
        },
      },
    },
  },
});

// Billing endpoints
builder.addPath({
  path: '/api/checkout',
  operations: {
    post: {
      summary: 'Create checkout session',
      tags: ['Billing'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                priceId: { type: 'string' },
                successUrl: { type: 'string' },
                cancelUrl: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Checkout session created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
});

builder.addPath({
  path: '/api/portal',
  operations: {
    post: {
      summary: 'Create billing portal session',
      tags: ['Billing'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Portal session created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
});

// Webhook endpoints
builder.addPath({
  path: '/api/webhooks/stripe',
  operations: {
    post: {
      summary: 'Stripe webhook',
      tags: ['Webhooks'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Webhook processed',
        },
      },
    },
  },
});

builder.addPath({
  path: '/api/webhooks/revenuecat',
  operations: {
    post: {
      summary: 'RevenueCat webhook',
      tags: ['Webhooks'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Webhook processed',
        },
      },
    },
  },
});

// Email endpoints
builder.addPath({
  path: '/api/email/welcome',
  operations: {
    post: {
      summary: 'Send welcome email',
      tags: ['Email'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Email sent',
        },
      },
    },
  },
});

export function getOpenApiSpec() {
  return builder.getSpecAsJson();
}
