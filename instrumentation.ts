/**
 * Next.js Instrumentation Hook
 * Initializes Datadog APM tracing before the application starts
 *
 * This file is automatically called by Next.js when the server starts
 * if experimental.instrumentationHook is enabled in next.config.ts
 */

export async function register() {
  // Only initialize Datadog in production or when explicitly enabled
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import dd-trace dynamically to avoid bundling issues
    const tracer = await import('dd-trace');
    tracer.default.init({
      // Service name - appears in Datadog UI
      service: process.env.DD_SERVICE || 'property-search',

      // Environment (development, staging, production)
      env: process.env.DD_ENV || process.env.NODE_ENV || 'development',

      // Version of your application (useful for tracking deployments)
      version: process.env.DD_VERSION || '1.0.0',

      // Note: DD_SITE is read automatically from environment variables
      // No need to pass it to init() - just set it in .env.local

      // Log injection - adds trace IDs to logs for correlation
      logInjection: true,

      // Runtime metrics - tracks Node.js performance
      runtimeMetrics: true,

      // Profiling (optional - can be enabled for deep performance insights)
      profiling: process.env.DD_PROFILING_ENABLED === 'true',

      // Sample rate (1.0 = 100% of traces, adjust for high-traffic apps)
      sampleRate: parseFloat(process.env.DD_TRACE_SAMPLE_RATE || '1.0'),
    });

    // Configure HTTP plugin to exclude static assets and internal routes
    // This reduces noise and saves on trace volume
    tracer.default.use('http', {
      blocklist: [
        /^\/_next\//,      // Next.js static files
        /^\/favicon\.ico/, // Favicon
        /^\/robots\.txt/,  // Robots.txt
        /_rsc=/,           // Next.js Server Components cache revalidation (query param)
      ],
    });

    console.log('Datadog APM initialized:', {
      service: process.env.DD_SERVICE || 'property-search',
      env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    });
  }
}
