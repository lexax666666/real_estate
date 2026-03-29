import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CrawlerRegistryService } from './crawler-registry.service';
import { CrawlerDbService } from './crawler-db.service';

export const CRAWL_QUEUE = 'property-crawl';

export interface CrawlJobData {
  address: string;
  state?: string;
  county?: string;
  siteId?: string;
  metadata?: Record<string, string>;
}

export interface CrawlJobResult {
  propertyId: number;
  siteId: string;
  address: string;
}

@Processor(CRAWL_QUEUE)
export class CrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    private readonly registry: CrawlerRegistryService,
    private readonly db: CrawlerDbService,
  ) {
    super();
  }

  async process(job: Job<CrawlJobData>): Promise<CrawlJobResult> {
    const { address, state, county, siteId, metadata } = job.data;

    this.logger.log(
      `Processing crawl job ${job.id}: ${address} (site=${siteId || 'auto'})`,
    );

    // Find the right adapter
    const adapter = siteId
      ? this.registry.getAdapter(siteId)
      : this.registry.findAdapter(address, state);

    if (!adapter) {
      const error = `No adapter found for address="${address}" state="${state}" siteId="${siteId}"`;
      await this.db.recordCrawlJob(address, siteId || 'unknown', 'failed', undefined, error);
      throw new Error(error);
    }

    try {
      await job.updateProgress(10);

      // Crawl the site
      const rawResult = await adapter.crawl({
        address,
        state,
        county,
        metadata,
      });

      await job.updateProgress(50);

      // Parse the results
      const parsed = adapter.parse(rawResult.html);
      parsed.rawHtml = rawResult.html;

      // Set county from job data if not parsed
      if (county && !parsed.county) {
        parsed.county = county;
      }

      await job.updateProgress(75);

      // Save to database
      const propertyId = await this.db.savePropertyFromCrawl(
        adapter.siteId,
        parsed,
      );

      // Record success
      await this.db.recordCrawlJob(
        address,
        adapter.siteId,
        'completed',
        propertyId,
      );

      await job.updateProgress(100);

      this.logger.log(
        `Completed crawl job ${job.id}: propertyId=${propertyId}`,
      );

      return {
        propertyId,
        siteId: adapter.siteId,
        address,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed crawl job ${job.id}: ${errorMsg}`,
      );
      await this.db.recordCrawlJob(
        address,
        adapter.siteId,
        'failed',
        undefined,
        errorMsg,
      );
      throw error;
    }
  }
}
