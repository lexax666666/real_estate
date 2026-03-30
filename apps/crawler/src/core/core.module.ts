import { Module } from '@nestjs/common';
import { CrawlerRegistryService } from './crawler-registry.service';
import { CrawlerDbService } from './crawler-db.service';
import { CrawlerProcessor } from './crawler.processor';
import { SdatModule } from '../sites/sdat/sdat.module';

@Module({
  imports: [SdatModule],
  providers: [CrawlerRegistryService, CrawlerDbService, CrawlerProcessor],
  exports: [CrawlerRegistryService, CrawlerDbService],
})
export class CoreModule {}
