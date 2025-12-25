import { NextRequest, NextResponse } from 'next/server';
import { getPropertyFromDB, savePropertyToDB, isCacheFresh } from '@/app/lib/db/properties/properties';
import { fetchPropertyFromRentCast, transformRentCastResponse } from '@/app/lib/api/rent-cast/rentCast';
import { addTraceTags, createCustomSpan, trackError, incrementMetric } from '@/app/lib/monitoring/datadog';

export async function GET(request: NextRequest) {
  console.log('Received request to /api/property');
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      addTraceTags({ 'error.type': 'validation', 'error.field': 'address' });
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Add address to trace for filtering in Datadog
    addTraceTags({
      'property.address': address,
      'request.endpoint': '/api/property',
    });

    // Check database cache first
    console.log('Checking database cache for:', address);
    const cachedProperty = await getPropertyFromDB(address);

    if (cachedProperty && isCacheFresh(cachedProperty.updatedAt)) {
      console.log('Returning cached property data');

      // Track cache hit
      addTraceTags({
        'cache.hit': true,
        'cache.fresh': true,
        'data.source': 'database_cache',
      });
      incrementMetric('property.cache.hit', 1, { source: 'database' });

      return NextResponse.json({
        ...cachedProperty.data,
        _cached: true,
        _cachedAt: cachedProperty.updatedAt,
      });
    }

    if (cachedProperty) {
      console.log('Cache exists but is stale, fetching fresh data');
      addTraceTags({
        'cache.hit': true,
        'cache.fresh': false,
        'cache.stale': true,
      });
      incrementMetric('property.cache.stale', 1);
    } else {
      console.log('No cache found, fetching from API');
      addTraceTags({
        'cache.hit': false,
        'cache.miss': true,
      });
      incrementMetric('property.cache.miss', 1);
    }

    try {
      // Fetch property data from RentCast API with custom span
      const property = await createCustomSpan(
        'rentcast.fetch.property',
        async () => await fetchPropertyFromRentCast(address),
        { address }
      );
      console.log('Property data received:', property);

      addTraceTags({
        'data.source': 'rentcast_api',
        'rentcast.success': true,
      });
      incrementMetric('property.api.success', 1, { source: 'rentcast' });

      // Transform the data
      const transformedData = transformRentCastResponse(property);

      // Save to database cache
      console.log('Saving property data to database');
      await savePropertyToDB(address, transformedData);

      return NextResponse.json({
        ...transformedData,
        _cached: false,
      });
    } catch (apiError: any) {
      console.error('RentCast API error:', apiError.response?.data || apiError.message);

      // Track error in Datadog
      trackError(apiError, {
        address,
        source: 'rentcast_api',
        status: apiError.response?.status || 'unknown',
      });
      incrementMetric('property.api.error', 1, { source: 'rentcast' });

      // Handle specific error cases
      if (apiError.message === 'RENTCAST_API_KEY is not configured') {
        return NextResponse.json(
          { error: 'API configuration error' },
          { status: 500 }
        );
      }

      if (apiError.message === 'Property not found') {
        return NextResponse.json(
          { error: 'Property not found at the specified address' },
          { status: 404 }
        );
      }

      if (apiError.response?.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your RentCast API configuration.' },
          { status: 401 }
        );
      }

      if (apiError.response?.status === 404) {
        return NextResponse.json(
          { error: 'Property not found at the specified address' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch property data. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);

    // Track unexpected server errors
    trackError(error as Error, {
      address: request.nextUrl.searchParams.get('address') || 'unknown',
      source: 'server',
    });
    incrementMetric('property.server.error', 1);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}