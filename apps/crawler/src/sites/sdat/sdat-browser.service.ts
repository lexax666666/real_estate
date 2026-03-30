import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightCrawler, Configuration } from 'crawlee';
import {
  SDAT_URL,
  SELECTORS,
  SEARCH_TYPES,
  MARYLAND_COUNTIES,
} from './sdat.constants';
import { SdatSearchParams } from './sdat.types';

@Injectable()
export class SdatBrowserService {
  private readonly logger = new Logger(SdatBrowserService.name);

  /**
   * Navigate the SDAT multi-step form and return the results page HTML.
   */
  async fetchPropertyHtml(params: SdatSearchParams): Promise<string> {
    const countyCode = this.resolveCountyCode(params.county);
    let resultHtml = '';

    const config = new Configuration({
      persistStorage: false,
      storageClientOptions: {
        localDataDirectory: `/tmp/crawlee-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    const crawler = new PlaywrightCrawler(
      {
        headless: true,
        maxRequestsPerCrawl: 1,
        maxRequestRetries: 1,
        requestHandlerTimeoutSecs: 60,
        browserPoolOptions: {
          maxOpenPagesPerBrowser: 1,
        },
        async requestHandler({ page, log }) {
          // Step 1: Select county and search type
          log.info(`Selecting county: ${params.county} (${countyCode})`);
          await page.waitForSelector(SELECTORS.countyDropdown, {
            timeout: 15000,
          });
          await page.selectOption(SELECTORS.countyDropdown, countyCode);
          await page.selectOption(
            SELECTORS.searchTypeDropdown,
            SEARCH_TYPES.STREET_ADDRESS,
          );

          // Step 2: Click Continue
          await page.click(SELECTORS.continueButton);

          // Step 3: Fill address fields
          await page.waitForSelector(SELECTORS.streetNumberInput, {
            timeout: 15000,
          });
          await page.fill(SELECTORS.streetNumberInput, params.streetNumber);
          await page.fill(SELECTORS.streetNameInput, params.streetName);

          // Step 4: Submit search
          await page.click(SELECTORS.stepNextButton);

          // Step 5: Wait for results
          await page.waitForSelector(SELECTORS.resultsTable, {
            timeout: 20000,
          });

          resultHtml = await page.content();
          log.info('Successfully retrieved SDAT results page');
        },
        failedRequestHandler({ request, log }) {
          log.error(`Request failed: ${request.url}`);
        },
      },
      config,
    );

    await crawler.run([SDAT_URL]);

    if (!resultHtml) {
      throw new Error(
        `SDAT crawl returned no results for ${params.streetNumber} ${params.streetName}, ${params.county}`,
      );
    }

    return resultHtml;
  }

  /**
   * Resolve a county name or code to the SDAT dropdown value.
   */
  private resolveCountyCode(county: string): string {
    const upper = county.toUpperCase().trim();

    // Already a numeric code
    if (/^\d{2}$/.test(upper)) {
      return upper;
    }

    const code = MARYLAND_COUNTIES[upper];
    if (!code) {
      throw new Error(
        `Unknown Maryland county: "${county}". Valid counties: ${Object.keys(MARYLAND_COUNTIES).join(', ')}`,
      );
    }
    return code;
  }

  /**
   * Parse a full address into SDAT search parameters.
   * Input: "8933 AMELUNG ST, FREDERICK, MD 21704"
   * Output: { county: "FREDERICK", streetNumber: "8933", streetName: "AMELUNG" }
   */
  static parseAddress(
    address: string,
    county: string,
  ): SdatSearchParams {
    const parts = address.split(/[,\s]+/);
    const streetNumber = parts[0] || '';
    // Take the second part as street name (SDAT search is flexible)
    const streetName = parts[1] || '';

    return {
      county,
      streetNumber,
      streetName,
    };
  }
}
