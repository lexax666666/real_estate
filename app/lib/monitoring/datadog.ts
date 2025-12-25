/**
 * Datadog monitoring utilities
 * Helper functions for custom tracing, tagging, and error tracking
 */

import tracer from 'dd-trace';

/**
 * Add custom tags to the current active trace
 * Tags help filter and analyze traces in Datadog UI
 *
 * @param tags - Object with key-value pairs to add as tags
 * @example
 * addTraceTags({
 *   'address': '123 Main St',
 *   'cache.hit': true,
 *   'data.source': 'api'
 * });
 */
export function addTraceTags(tags: Record<string, string | number | boolean>): void {
  try {
    const span = tracer.scope().active();
    if (span) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }
  } catch (error) {
    // Silently fail if tracing is not initialized
    console.error('Failed to add Datadog tags:', error);
  }
}

/**
 * Create a custom span for tracking specific operations
 * Use this to measure performance of specific code blocks
 *
 * @param operationName - Name of the operation (e.g., 'rentcast.api.call')
 * @param callback - Async function to execute within the span
 * @param tags - Optional tags to add to the span
 * @returns Result of the callback function
 *
 * @example
 * const result = await createCustomSpan(
 *   'rentcast.fetch.property',
 *   async () => {
 *     return await fetchPropertyFromRentCast(address);
 *   },
 *   { address: '123 Main St' }
 * );
 */
export async function createCustomSpan<T>(
  operationName: string,
  callback: () => Promise<T>,
  tags?: Record<string, string | number | boolean>
): Promise<T> {
  try {
    const span = tracer.startSpan(operationName);

    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    try {
      const result = await callback();
      span.setTag('error', false);
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      span.finish();
    }
  } catch (error) {
    // If tracing fails, still execute the callback
    return await callback();
  }
}

/**
 * Track an error with context in Datadog
 *
 * @param error - The error object
 * @param context - Additional context to attach to the error
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   trackError(error, { address: '123 Main St', operation: 'fetch' });
 *   throw error;
 * }
 */
export function trackError(
  error: Error | unknown,
  context?: Record<string, string | number | boolean>
): void {
  try {
    const span = tracer.scope().active();
    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error instanceof Error ? error.message : 'Unknown error');
      span.setTag('error.stack', error instanceof Error ? error.stack : '');

      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          span.setTag(`error.context.${key}`, value);
        });
      }
    }
  } catch (tracingError) {
    console.error('Failed to track error in Datadog:', tracingError);
  }
}

/**
 * Increment a custom metric/counter in Datadog
 *
 * @param metricName - Name of the metric (e.g., 'property.cache.hit')
 * @param value - Value to increment by (default: 1)
 * @param tags - Optional tags for the metric
 *
 * @example
 * incrementMetric('property.cache.hit', 1, { source: 'database' });
 */
export function incrementMetric(
  metricName: string,
  value: number = 1,
  tags?: Record<string, string>
): void {
  try {
    const dogstatsd = tracer.dogstatsd;
    if (dogstatsd) {
      const tagArray = tags
        ? Object.entries(tags).map(([key, val]) => `${key}:${val}`)
        : [];
      dogstatsd.increment(metricName, value, tagArray);
    }
  } catch (error) {
    console.error('Failed to increment Datadog metric:', error);
  }
}

/**
 * Record a timing/histogram metric in Datadog
 *
 * @param metricName - Name of the metric (e.g., 'property.api.response_time')
 * @param value - Duration in milliseconds
 * @param tags - Optional tags for the metric
 *
 * @example
 * const startTime = Date.now();
 * await fetchData();
 * recordTiming('property.fetch.duration', Date.now() - startTime);
 */
export function recordTiming(
  metricName: string,
  value: number,
  tags?: Record<string, string>
): void {
  try {
    const dogstatsd = tracer.dogstatsd;
    if (dogstatsd) {
      const tagArray = tags
        ? Object.entries(tags).map(([key, val]) => `${key}:${val}`)
        : [];
      dogstatsd.histogram(metricName, value, tagArray);
    }
  } catch (error) {
    console.error('Failed to record Datadog timing:', error);
  }
}
