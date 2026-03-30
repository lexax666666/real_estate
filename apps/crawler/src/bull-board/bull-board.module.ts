import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CRAWL_QUEUE } from '../core/crawler.processor';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
})
export class BullBoardModule implements OnModuleInit {
  constructor(
    @InjectQueue(CRAWL_QUEUE) private readonly crawlQueue: Queue,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  onModuleInit() {
    const serverAdapter = new FastifyAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(this.crawlQueue)],
      serverAdapter,
    });

    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const instance = httpAdapter.getInstance();
    instance.register(serverAdapter.registerPlugin(), {
      basePath: '/admin/queues',
      prefix: '/admin/queues',
    });
  }
}
