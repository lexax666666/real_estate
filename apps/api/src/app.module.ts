import { Module } from '@nestjs/common';
import { PropertyModule } from './property/property.module';
import { HealthController } from './health.controller';
import { DrizzleModule } from './db/db.module';

@Module({
  imports: [DrizzleModule, PropertyModule],
  controllers: [HealthController],
})
export class AppModule {}
