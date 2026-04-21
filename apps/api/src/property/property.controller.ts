import {
  Controller,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { DatadogService } from '../monitoring/datadog.service';

@Controller('api/property')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly datadogService: DatadogService,
  ) {}

  @Get('search')
  async searchProperty(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    try {
      return await this.propertyService.searchProperty(query, parsedLimit);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('Search error:', error);
      this.datadogService.trackError(error, { query, source: 'search' });
      throw new InternalServerErrorException('Search failed');
    }
  }

  @Get('autocomplete')
  async autocompleteProperty(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
      throw new BadRequestException('Limit must be between 1 and 20');
    }

    try {
      return await this.propertyService.autocompleteProperty(query, parsedLimit);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('Autocomplete error:', error);
      this.datadogService.trackError(error, { query, source: 'autocomplete' });
      throw new InternalServerErrorException('Autocomplete failed');
    }
  }

  @Get()
  async getProperty(@Query('address') address: string) {
    console.log('Received request to /api/property');

    if (!address) {
      this.datadogService.addTraceTags({
        'error.type': 'validation',
        'error.field': 'address',
      });
      throw new BadRequestException('Address is required');
    }

    this.datadogService.addTraceTags({
      'property.address': address,
      'request.endpoint': '/api/property',
    });

    try {
      const result = await this.propertyService.getProperty(address);
      return result;
    } catch (error: any) {
      // If it is already an HttpException from the service, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Server error:', error);
      this.datadogService.trackError(error, {
        address: address || 'unknown',
        source: 'server',
      });
      this.datadogService.incrementMetric('property.server.error', 1);

      throw new InternalServerErrorException('Internal server error');
    }
  }
}
