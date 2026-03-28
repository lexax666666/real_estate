import { Module } from '@nestjs/common';
import { PropertyModule } from './property/property.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PropertyModule],
  controllers: [HealthController],
})
export class AppModule {}
