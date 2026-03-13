/**
 * Next.js Instrumentation — OpenTelemetry + Sentry
 *
 * This file is automatically loaded by Next.js at startup.
 * It initializes distributed tracing for all server-side operations:
 * - API routes, server components, middleware
 * - Database queries, external HTTP calls
 * - Sentry error tracking with trace context
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side: full OpenTelemetry SDK
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const {
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
    } = await import("@opentelemetry/semantic-conventions");

    // Sentry OpenTelemetry integration
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      environment: process.env.NODE_ENV,
      skipOpenTelemetrySetup: true, // We handle OTel ourselves
    });

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: "saas-web",
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.1.0",
      }),
      traceExporter: new OTLPTraceExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
          "http://localhost:4318/v1/traces",
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy FS instrumentation
          "@opentelemetry/instrumentation-fs": { enabled: false },
          // Keep HTTP, fetch, postgres, etc.
          "@opentelemetry/instrumentation-http": { enabled: true },
          "@opentelemetry/instrumentation-fetch": { enabled: true },
        }),
        Sentry.sentryOpenTelemetryNodeInstrumentation(),
      ],
    });

    sdk.start();

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk.shutdown().catch(console.error);
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime: Sentry only (no full OTel SDK)
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      environment: process.env.NODE_ENV,
    });
  }
}
