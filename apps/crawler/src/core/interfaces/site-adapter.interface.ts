import { ParsedPropertyData } from './crawl-result.interface';

export interface CrawlParams {
  address: string;
  city?: string;
  state?: string;
  county?: string;
  zipCode?: string;
  /** Site-specific params (e.g., SDAT county code) */
  metadata?: Record<string, string>;
}

export interface CrawlRawResult {
  html: string;
  url: string;
  screenshots?: Buffer[];
}

/**
 * Contract that every site adapter must implement.
 * Adding a new property data site = implementing this interface.
 */
export interface SiteAdapter {
  /** Unique site identifier, e.g. 'md-sdat', 'va-rpa' */
  readonly siteId: string;

  /** Human-readable name */
  readonly siteName: string;

  /** Which US states this adapter covers */
  readonly supportedStates: string[];

  /** Can this adapter handle the given address? */
  canHandle(address: string, state?: string): boolean;

  /** Navigate the site and retrieve the raw results HTML for a property */
  crawl(params: CrawlParams): Promise<CrawlRawResult>;

  /** Parse raw HTML into normalized property data */
  parse(rawHtml: string): ParsedPropertyData;
}

export const SITE_ADAPTER = Symbol('SITE_ADAPTER');
