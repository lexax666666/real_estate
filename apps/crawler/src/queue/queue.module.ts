import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CRAWL_QUEUE } from '../core/crawler.processor';

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: process.env.REDIS_URL
        ? parseRedisUrl(process.env.REDIS_URL)
        : {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
          },
    }),
    BullModule.registerQueue({
      name: CRAWL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
