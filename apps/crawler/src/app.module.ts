import { Module } from '@nestjs/common';
import { DrizzleModule } from './db/db.module';
import { QueueModule } from './queue/queue.module';
import { BullBoardModule } from './bull-board/bull-board.module';
import { CoreModule } from './core/core.module';
import { SdatModule } from './sites/sdat/sdat.module';
import { HealthController } from './health.controller';
import { CrawlController } from './crawl.controller';

@Module({
  imports: [
    DrizzleModule,
    QueueModule,
    CoreModule,
    SdatModule,
    BullBoardModule,
  ],
  controllers: [HealthController, CrawlController],
})
export class AppModule {}
