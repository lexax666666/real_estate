/**
 * Datadog APM initialization
 * Must be called before any other imports/code to properly instrument the app
 */

import tracer from 'dd-trace';

export function initializeDatadog() {
  // Only initialize Datadog in production or when explicitly enabled
  if (process.env.DD_ENABLED === 'false') {
    console.log('Datadog APM disabled via DD_ENABLED=false');
    return;
  }

  tracer.init({
    // Service name - appears in Datadog UI
    service: process.env.DD_SERVICE || 'property-search-api',

    // Environment (development, staging, production)
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',

    // Version of your application (useful for tracking deployments)
    version: process.env.DD_VERSION || '1.0.0',

    // Log injection - adds trace IDs to logs for correlation
    logInjection: true,

    // Runtime metrics - tracks Node.js performance
    runtimeMetrics: true,

    // Profiling (optional - can be enabled for deep performance insights)
    profiling: process.env.DD_PROFILING_ENABLED === 'true',

    // Sample rate (1.0 = 100% of traces, adjust for high-traffic apps)
    sampleRate: parseFloat(process.env.DD_TRACE_SAMPLE_RATE || '1.0'),
  });

  console.log('Datadog APM initialized:', {
    service: process.env.DD_SERVICE || 'property-search-api',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
  });
}
