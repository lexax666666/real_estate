import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { SiteAdapter, SITE_ADAPTER } from './interfaces/site-adapter.interface';

/**
 * Registry that collects all site adapters and routes crawl requests
 * to the correct adapter based on address/state or explicit siteId.
 */
@Injectable()
export class CrawlerRegistryService {
  private readonly logger = new Logger(CrawlerRegistryService.name);
  private readonly adapters: Map<string, SiteAdapter> = new Map();

  constructor(
    @Optional()
    @Inject(SITE_ADAPTER)
    adapters: SiteAdapter[] = [],
  ) {
    const adapterList = Array.isArray(adapters) ? adapters : [adapters];
    for (const adapter of adapterList) {
      if (adapter) {
        this.adapters.set(adapter.siteId, adapter);
        this.logger.log(
          `Registered site adapter: ${adapter.siteId} (${adapter.siteName})`,
        );
      }
    }
  }

  /** Get adapter by explicit site ID */
  getAdapter(siteId: string): SiteAdapter | undefined {
    return this.adapters.get(siteId);
  }

  /** Find the first adapter that can handle this address/state */
  findAdapter(address: string, state?: string): SiteAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(address, state)) {
        return adapter;
      }
    }
    return undefined;
  }

  /** Get all registered adapter IDs */
  getRegisteredSiteIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /** Get all registered adapters */
  getAllAdapters(): SiteAdapter[] {
    return Array.from(this.adapters.values());
  }
}
