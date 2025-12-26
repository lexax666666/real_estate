import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint
 * Use this to verify the app is running and check Datadog configuration
 */
export async function GET(request: NextRequest) {
  console.log('[Health] Health check called');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    },
    datadog: {
      DD_SERVICE: process.env.DD_SERVICE || 'NOT SET',
      DD_ENV: process.env.DD_ENV || 'NOT SET',
      DD_SITE: process.env.DD_SITE || 'NOT SET',
      DD_VERSION: process.env.DD_VERSION || 'NOT SET',
      DD_API_KEY_CONFIGURED: !!process.env.DD_API_KEY,
      DD_API_KEY_LENGTH: process.env.DD_API_KEY?.length || 0,
    },
  };

  console.log('[Health] Health check response:', health);

  return NextResponse.json(health);
}
