import { Injectable } from '@nestjs/common';
import {
  SiteAdapter,
  CrawlParams,
  CrawlRawResult,
} from '../../core/interfaces/site-adapter.interface';
import { ParsedPropertyData } from '../../core/interfaces/crawl-result.interface';
import { SdatBrowserService } from './sdat-browser.service';
import { SdatParserService } from './sdat-parser.service';
import { SDAT_SITE_ID, SDAT_SITE_NAME } from './sdat.constants';

@Injectable()
export class SdatAdapter implements SiteAdapter {
  readonly siteId = SDAT_SITE_ID;
  readonly siteName = SDAT_SITE_NAME;
  readonly supportedStates = ['MD'];

  constructor(
    private readonly browser: SdatBrowserService,
    private readonly parser: SdatParserService,
  ) {}

  canHandle(address: string, state?: string): boolean {
    if (state) {
      return state.toUpperCase() === 'MD';
    }
    // Check if address contains Maryland indicators
    const upper = address.toUpperCase();
    return upper.includes(', MD ') || upper.includes(', MD,') || upper.endsWith(', MD');
  }

  async crawl(params: CrawlParams): Promise<CrawlRawResult> {
    const county = params.county || params.metadata?.county;
    if (!county) {
      throw new Error('County is required for SDAT crawl');
    }

    const searchParams = SdatBrowserService.parseAddress(params.address, county);
    const html = await this.browser.fetchPropertyHtml(searchParams);

    return {
      html,
      url: `https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx`,
    };
  }

  parse(rawHtml: string): ParsedPropertyData {
    const result = this.parser.parsePropertyPage(rawHtml);

    // Map SDAT-specific result to the normalized ParsedPropertyData
    const lastTransfer = result.transfers[0];

    // Build tax assessments from base and current values
    const taxAssessments: Record<
      string,
      { land: number; improvements: number; total: number }
    > = {};

    // Use current value as the latest assessment
    if (result.currentValue.total > 0) {
      const currentYear = new Date().getFullYear();
      taxAssessments[currentYear.toString()] = {
        land: result.currentValue.land,
        improvements: result.currentValue.improvements,
        total: result.currentValue.total,
      };
    }

    // Sale history
    const saleHistory = result.transfers
      .filter((t) => t.date)
      .map((t) => ({
        date: t.date,
        price: t.price,
        seller: t.seller,
        type: t.type,
        deedRef: t.deedRef1,
      }));

    // Parse city/state/zip from premises address
    // Format: "8933 AMELUNG ST, FREDERICK 21704-7918"
    const addressLine2 = result.premisesAddress.split(',').pop()?.trim() || '';
    const cityZipMatch = addressLine2.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    const city = cityZipMatch?.[1] || '';
    const zipCode = cityZipMatch?.[2] || '';

    return {
      address: result.premisesAddress,
      city,
      state: 'MD',
      zipCode,
      county: undefined, // Caller should provide
      ownerNames: result.ownerNames.join(', '),
      propertyType: result.propertyUse,
      yearBuilt: result.yearBuilt ?? undefined,
      squareFootage: result.aboveGradeLivingArea ?? undefined,
      lotSize: result.landArea ? parseInt(result.landArea.replace(/\D/g, ''), 10) || undefined : undefined,
      stories: result.stories ?? undefined,
      basement: result.basement ? 'YES' : 'NO',
      garageSpaces: result.garageSpaces ?? undefined,
      lastSaleDate: lastTransfer?.date,
      lastSalePrice: lastTransfer?.price,
      legalDescription: result.legalDescription,
      neighborhood: result.neighborhood,
      subdivision: result.subdivisionCode,
      taxAssessments,
      saleHistory,

      // SDAT-specific fields stored as jsonb
      siteSpecificData: {
        accountId: result.accountId,
        district: result.district,
        mailingAddress: result.mailingAddress,
        deedReference: result.deedReference,
        principalResidence: result.principalResidence,
        propertyUse: result.propertyUse,
        map: result.map,
        grid: result.grid,
        parcel: result.parcel,
        section: result.section,
        block: result.block,
        lot: result.lot,
        aboveGradeLivingArea: result.aboveGradeLivingArea,
        finishedBasementArea: result.finishedBasementArea,
        exterior: result.exterior,
        quality: result.quality,
        structureType: result.structureType,
        fullBaths: result.fullBaths,
        halfBaths: result.halfBaths,
        garageType: result.garageType,
        baseValue: result.baseValue,
        currentValue: result.currentValue,
        phaseInAssessments: result.phaseInAssessments,
        exemptions: result.exemptions,
        homesteadStatus: result.homesteadStatus,
        homesteadApplicationDate: result.homesteadApplicationDate,
      },

      rawHtml: '',  // Will be set by the processor with full HTML
    };
  }
}
