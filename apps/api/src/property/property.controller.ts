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
