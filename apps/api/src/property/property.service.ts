import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertyDbService, SearchResponse, SearchResult } from './property-db.service';
import { RentCastService } from './rent-cast.service';
import { DatadogService } from '../monitoring/datadog.service';
import { AddressParserService } from './address-parser.service';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyDbService: PropertyDbService,
    private readonly rentCastService: RentCastService,
    private readonly datadogService: DatadogService,
    private readonly addressParser: AddressParserService,
  ) {}

  async getProperty(address: string) {
    // Parse the user input to get structured address components
    const parsed = this.addressParser.parseAddress(address);

    // Check database cache first
    console.log('Checking database cache for:', address);
    const cachedProperty = await this.propertyDbService.getPropertyFromDB(address);

    if (cachedProperty) {
      console.log('Returning cached property data');

      this.datadogService.addTraceTags({
        'cache.hit': true,
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

    console.log('No cache found, fetching from API');
    this.datadogService.addTraceTags({
      'cache.hit': false,
      'cache.miss': true,
    });
    this.datadogService.incrementMetric('property.cache.miss', 1);

    try {
      // Use the full parsed address for RentCast API call
      const rentCastAddress = parsed.fullAddress;
      console.log('Fetching from RentCast with address:', rentCastAddress);

      const property = await this.datadogService.createCustomSpan(
        'rentcast.fetch.property',
        async () => await this.rentCastService.fetchPropertyFromRentCast(rentCastAddress),
        { address: rentCastAddress },
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

      // Save to database cache using the parsed street address
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

  async searchProperty(query: string, limit = 10): Promise<SearchResponse> {
    this.datadogService.addTraceTags({
      'search.query': query,
      'search.limit': limit,
      'request.endpoint': '/api/property/search',
    });

    const response = await this.propertyDbService.searchProperties(query, limit);

    this.datadogService.addTraceTags({
      'search.results_count': response.results.length,
      'search.auto_selected': response.autoSelected,
      'search.top_score': response.results[0]?.score ?? 0,
    });
    this.datadogService.incrementMetric('property.search', 1);

    return response;
  }

  async autocompleteProperty(query: string, limit = 5): Promise<SearchResult[]> {
    this.datadogService.addTraceTags({
      'autocomplete.query': query,
      'request.endpoint': '/api/property/autocomplete',
    });

    const results = await this.propertyDbService.autocompleteProperties(query, limit);

    this.datadogService.incrementMetric('property.autocomplete', 1);

    return results;
  }
}
