import { describe, it, expect, beforeAll } from 'vitest';
import { SdatBrowserService } from '../sdat-browser.service';
import { SdatParserService } from '../sdat-parser.service';
import { SdatSearchParams } from '../sdat.types';

/**
 * E2E test — hits the real SDAT website with Playwright.
 * Run with: pnpm --filter @property-search/crawler test -- sdat-browser.service.e2e
 */
describe('SdatBrowserService (e2e)', () => {
  let browserService: SdatBrowserService;
  let parserService: SdatParserService;

  beforeAll(() => {
    browserService = new SdatBrowserService();
    parserService = new SdatParserService();
  });

  it('should fetch property HTML from SDAT for a known address', async () => {
    const params: SdatSearchParams = {
      county: 'FREDERICK',
      streetNumber: '8933',
      streetName: 'AMELUNG',
    };

    const html = await browserService.fetchPropertyHtml(params);

    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('Real Property Data Search');
    expect(html).toContain('AMELUNG');
  }, 90000);

  it('should return HTML that the parser can process', async () => {
    const params: SdatSearchParams = {
      county: 'FREDERICK',
      streetNumber: '8933',
      streetName: 'AMELUNG',
    };

    const html = await browserService.fetchPropertyHtml(params);
    const result = parserService.parsePropertyPage(html);

    expect(result.ownerNames.length).toBeGreaterThan(0);
    expect(result.premisesAddress).toContain('AMELUNG');
    expect(result.district).toBeTruthy();
    expect(result.accountId).toBeTruthy();
    expect(result.yearBuilt).toBeGreaterThan(1900);
    expect(result.currentValue.total).toBeGreaterThan(0);
  }, 90000);

  it('should work with parseAddress helper end-to-end', async () => {
    const params = SdatBrowserService.parseAddress(
      '8933 AMELUNG ST, FREDERICK, MD 21704',
      'FREDERICK',
    );

    expect(params).toEqual({
      county: 'FREDERICK',
      streetNumber: '8933',
      streetName: 'AMELUNG',
    });

    const html = await browserService.fetchPropertyHtml(params);
    const result = parserService.parsePropertyPage(html);

    expect(result.premisesAddress).toContain('AMELUNG');
    expect(result.currentValue.total).toBeGreaterThan(0);
    expect(result.transfers.length).toBeGreaterThan(0);
  }, 90000);

  it('should throw for an invalid county', async () => {
    const params: SdatSearchParams = {
      county: 'NONEXISTENT',
      streetNumber: '123',
      streetName: 'FAKE',
    };

    await expect(browserService.fetchPropertyHtml(params)).rejects.toThrow(
      /Unknown Maryland county/,
    );
  });
});
