import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyDbService } from './property-db.service';
import { RentCastService } from './rent-cast.service';
import { DatadogService } from '../monitoring/datadog.service';
import { AddressParserService } from './address-parser.service';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, PropertyDbService, RentCastService, DatadogService, AddressParserService],
})
export class PropertyModule {}
