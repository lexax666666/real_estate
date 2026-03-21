/**
 * Datadog monitoring service
 * Helper functions for custom tracing, tagging, and error tracking
 */

import { Injectable } from '@nestjs/common';
import tracer from 'dd-trace';

@Injectable()
export class DatadogService {
  /**
   * Add custom tags to the current active trace
   * Tags help filter and analyze traces in Datadog UI
   */
  addTraceTags(tags: Record<string, string | number | boolean>): void {
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
   */
  async createCustomSpan<T>(
    operationName: string,
    callback: () => Promise<T>,
    tags?: Record<string, string | number | boolean>,
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
        span.setTag(
          'error.message',
          error instanceof Error ? error.message : 'Unknown error',
        );
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
   */
  trackError(
    error: Error | unknown,
    context?: Record<string, string | number | boolean>,
  ): void {
    try {
      const span = tracer.scope().active();
      if (span) {
        span.setTag('error', true);
        span.setTag(
          'error.message',
          error instanceof Error ? error.message : 'Unknown error',
        );
        span.setTag(
          'error.stack',
          error instanceof Error ? error.stack : '',
        );

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
   */
  incrementMetric(
    metricName: string,
    value: number = 1,
    tags?: Record<string, string>,
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
   */
  recordTiming(
    metricName: string,
    value: number,
    tags?: Record<string, string>,
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
}
