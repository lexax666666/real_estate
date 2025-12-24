import { NextRequest, NextResponse } from 'next/server';
import { getPropertyFromDB, savePropertyToDB, isCacheFresh } from '@/app/lib/db/properties/properties';
import { fetchPropertyFromRentCast, transformRentCastResponse } from '@/app/lib/api/rent-cast/rentCast';

export async function GET(request: NextRequest) {
  console.log('Received request to /api/property');
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Check database cache first
    console.log('Checking database cache for:', address);
    const cachedProperty = await getPropertyFromDB(address);

    if (cachedProperty && isCacheFresh(cachedProperty.updatedAt)) {
      console.log('Returning cached property data');
      return NextResponse.json({
        ...cachedProperty.data,
        _cached: true,
        _cachedAt: cachedProperty.updatedAt,
      });
    }

    if (cachedProperty) {
      console.log('Cache exists but is stale, fetching fresh data');
    } else {
      console.log('No cache found, fetching from API');
    }

    try {
      // Fetch property data from RentCast API
      const property = await fetchPropertyFromRentCast(address);
      console.log('Property data received:', property);

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}