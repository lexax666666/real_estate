import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CRAWL_QUEUE, CrawlJobData } from './core/crawler.processor';

@Controller('api/crawl')
export class CrawlController {
  constructor(
    @InjectQueue(CRAWL_QUEUE) private readonly crawlQueue: Queue<CrawlJobData>,
  ) {}

  @Post()
  async enqueue(
    @Body() body: { address?: string; state?: string; county?: string; siteId?: string; metadata?: Record<string, string> },
  ) {
    if (!body.address) {
      throw new BadRequestException('address is required');
    }

    const data: CrawlJobData = { address: body.address };
    if (body.state) data.state = body.state;
    if (body.county) data.county = body.county;
    if (body.siteId) data.siteId = body.siteId;
    if (body.metadata) data.metadata = body.metadata;

    const job = await this.crawlQueue.add('crawl', data);

    return { jobId: job.id, status: 'queued' };
  }
}
