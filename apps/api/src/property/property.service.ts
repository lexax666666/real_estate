import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertyDbService } from './property-db.service';
import { RentCastService } from './rent-cast.service';
import { DatadogService } from '../monitoring/datadog.service';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyDbService: PropertyDbService,
    private readonly rentCastService: RentCastService,
    private readonly datadogService: DatadogService,
  ) {}

  async getProperty(address: string) {
    // Check database cache first
    console.log('Checking database cache for:', address);
    const cachedProperty = await this.propertyDbService.getPropertyFromDB(address);

    if (cachedProperty && this.propertyDbService.isCacheFresh(cachedProperty.updatedAt)) {
      console.log('Returning cached property data');

      this.datadogService.addTraceTags({
        'cache.hit': true,
        'cache.fresh': true,
        'data.source': 'database_cache',
        'response.cached': true,
        'property.type': cachedProperty.data.propertyType || 'unknown',
        'property.city': cachedProperty.data.city || 'unknown',
        'property.state': cachedProperty.data.state || 'unknown',
        'property.owner': cachedProperty.data.ownerName || 'unknown',
        'property.bedrooms': cachedProperty.data.bedrooms || 0,
        'property.bathrooms': cachedProperty.data.bathrooms || 0,
      });
      this.datadogService.incrementMetric('property.cache.hit', 1, { source: 'database' });

      return {
        ...cachedProperty.data,
        _cached: true,
        _cachedAt: cachedProperty.updatedAt,
      };
    }

    if (cachedProperty) {
      console.log('Cache exists but is stale, fetching fresh data');
      this.datadogService.addTraceTags({
        'cache.hit': true,
        'cache.fresh': false,
        'cache.stale': true,
      });
      this.datadogService.incrementMetric('property.cache.stale', 1);
    } else {
      console.log('No cache found, fetching from API');
      this.datadogService.addTraceTags({
        'cache.hit': false,
        'cache.miss': true,
      });
      this.datadogService.incrementMetric('property.cache.miss', 1);
    }

    try {
      // Fetch property data from RentCast API with custom span
      const property = await this.datadogService.createCustomSpan(
        'rentcast.fetch.property',
        async () => await this.rentCastService.fetchPropertyFromRentCast(address),
        { address },
      );
      console.log('Property data received:', property);

      this.datadogService.addTraceTags({
        'data.source': 'rentcast_api',
        'rentcast.success': true,
      });
      this.datadogService.incrementMetric('property.api.success', 1, { source: 'rentcast' });

      // Transform the data
      const transformedData = this.rentCastService.transformRentCastResponse(property);

      // Add key response fields as tags
      this.datadogService.addTraceTags({
        'response.cached': false,
        'property.type': transformedData.propertyType || 'unknown',
        'property.city': transformedData.city || 'unknown',
        'property.state': transformedData.state || 'unknown',
        'property.owner': transformedData.ownerName || 'unknown',
        'property.bedrooms': transformedData.bedrooms || 0,
        'property.bathrooms': transformedData.bathrooms || 0,
        'property.year_built': transformedData.yearBuilt || 0,
        'property.square_footage': transformedData.squareFootage || 0,
      });

      // Save to database cache
      console.log('Saving property data to database');
      await this.propertyDbService.savePropertyToDB(address, transformedData);

      return {
        ...transformedData,
        _cached: false,
      };
    } catch (apiError: any) {
      console.error('RentCast API error:', apiError.response?.data || apiError.message);

      // Track error in Datadog
      this.datadogService.trackError(apiError, {
        address,
        source: 'rentcast_api',
        status: apiError.response?.status || 'unknown',
      });
      this.datadogService.incrementMetric('property.api.error', 1, { source: 'rentcast' });

      // Handle specific error cases
      if (apiError.message === 'RENTCAST_API_KEY is not configured') {
        throw new InternalServerErrorException('API configuration error');
      }

      if (apiError.message === 'Property not found') {
        throw new NotFoundException('Property not found at the specified address');
      }

      if (apiError.response?.status === 401) {
        throw new UnauthorizedException(
          'Invalid API key. Please check your RentCast API configuration.',
        );
      }

      if (apiError.response?.status === 404) {
        throw new NotFoundException('Property not found at the specified address');
      }

      throw new InternalServerErrorException('Failed to fetch property data. Please try again.');
    }
  }
}
