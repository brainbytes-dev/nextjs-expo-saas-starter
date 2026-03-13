import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Enable OpenTelemetry instrumentation
  // Next.js auto-loads src/instrumentation.ts at startup
  experimental: {
    instrumentationHook: true,
  },

  // Vercel Skew Protection — ensures clients on old deployments
  // get routed to the correct version during rollouts
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
};

export default nextConfig;
