// OpenAPI 3.0 spec for SaaS API

export function getOpenApiSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'SaaS API',
      version: '1.0.0',
      description: 'API documentation for SaaS platform',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003',
        description: 'API Server',
      },
    ],
    paths: {
      '/api/auth/signin': {
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
      '/api/auth/signup': {
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
      '/api/checkout': {
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
      '/api/portal': {
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
      '/api/webhooks/stripe': {
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
      '/api/webhooks/revenuecat': {
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
      '/api/email/welcome': {
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
    },
  };
}
