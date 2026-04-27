import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SdatAdapter } from '../sdat.adapter';
import { SdatBrowserService } from '../sdat-browser.service';
import { SdatParserService } from '../sdat-parser.service';
import { SdatPropertyResult } from '../sdat.types';

/** Build a complete SdatPropertyResult fixture with sensible defaults. */
function createMockParserResult(
  overrides: Partial<SdatPropertyResult> = {},
): SdatPropertyResult {
  return {
    ownerNames: ['CHEN KEQIANG', 'WANG HONGDI'],
    mailingAddress: '8933 AMELUNG ST FREDERICK MD 21704',
    deedReference: '/11593/ 00095',
    principalResidence: true,
    propertyUse: 'TOWN HOUSE',
    premisesAddress: '8933 AMELUNG ST, FREDERICK 21704-7918',
    accountId: '07-247192',
    district: '07',
    legalDescription: 'LOT 1287 VILLAGES OF URBANA',
    map: '0096',
    grid: '0009',
    parcel: '0249',
    neighborhood: '7030030.11',
    subdivisionCode: '0000',
    section: 'M1B',
    block: '',
    lot: '1287',
    yearBuilt: 2008,
    aboveGradeLivingArea: 1868,
    finishedBasementArea: null,
    landArea: '1,592 SF',
    stories: 3,
    basement: false,
    structureType: 'END UNIT',
    exterior: 'BRICK',
    quality: '5',
    fullBaths: 2,
    halfBaths: 2,
    garageType: 'Attached',
    garageSpaces: 1,
    baseValue: { land: 135000, improvements: 299400, total: 434400 },
    currentValue: { land: 170000, improvements: 385300, total: 555300 },
    phaseInAssessments: [
      { date: '07/01/2025', land: 0, improvements: 0, total: 474700 },
      { date: '07/01/2026', land: 0, improvements: 0, total: 515000 },
    ],
    transfers: [
      {
        seller: 'KONAI  KELLY L',
        date: '01/04/2017',
        price: 333000,
        type: 'ARMS LENGTH IMPROVED',
        deedRef1: '/11593/ 00095',
        deedRef2: '',
      },
      {
        seller: 'MONOCACY LAND COMPANY, LLC.',
        date: '04/17/2008',
        price: 329090,
        type: 'ARMS LENGTH IMPROVED',
        deedRef1: '/06953/ 00083',
        deedRef2: '',
      },
    ],
    exemptions: { partialExempt: 'None' },
    homesteadStatus: 'Approved',
    homesteadApplicationDate: '09/18/2017',
    ...overrides,
  };
}

describe('SdatAdapter', () => {
  let adapter: SdatAdapter;
  let mockBrowser: SdatBrowserService;
  let mockParser: SdatParserService;

  beforeEach(() => {
    mockBrowser = {} as SdatBrowserService;
    mockParser = {
      parsePropertyPage: vi.fn(),
    } as unknown as SdatParserService;
    adapter = new SdatAdapter(mockBrowser, mockParser);
  });

  describe('siteId and siteName', () => {
    it('should expose md-sdat as siteId', () => {
      expect(adapter.siteId).toBe('md-sdat');
    });

    it('should expose the full site name', () => {
      expect(adapter.siteName).toBe('Maryland SDAT Real Property Search');
    });

    it('should list MD in supportedStates', () => {
      expect(adapter.supportedStates).toEqual(['MD']);
    });
  });

  describe('canHandle', () => {
    it('should return true when state is "MD"', () => {
      expect(adapter.canHandle('123 Main St', 'MD')).toBe(true);
    });

    it('should return true when state is "md" (case insensitive)', () => {
      expect(adapter.canHandle('123 Main St', 'md')).toBe(true);
    });

    it('should return true when state is "Md" (mixed case)', () => {
      expect(adapter.canHandle('123 Main St', 'Md')).toBe(true);
    });

    it('should return false when state is "VA"', () => {
      expect(adapter.canHandle('123 Main St', 'VA')).toBe(false);
    });

    it('should return false when state is "NY"', () => {
      expect(adapter.canHandle('123 Main St', 'NY')).toBe(false);
    });

    it('should return false when state is an empty string', () => {
      expect(adapter.canHandle('123 Main St', '')).toBe(false);
    });

    it('should return true when state is undefined and address contains ", MD "', () => {
      expect(
        adapter.canHandle('8933 AMELUNG ST, FREDERICK, MD 21704'),
      ).toBe(true);
    });

    it('should return true when state is undefined and address contains ", MD,"', () => {
      expect(
        adapter.canHandle('8933 AMELUNG ST, MD, FREDERICK'),
      ).toBe(true);
    });

    it('should return true when state is undefined and address ends with ", MD"', () => {
      expect(adapter.canHandle('8933 AMELUNG ST, MD')).toBe(true);
    });

    it('should return false when state is undefined and address has no MD indicator', () => {
      expect(
        adapter.canHandle('123 Main St, Arlington, VA 22201'),
      ).toBe(false);
    });

    it('should be case insensitive when checking address for MD indicator', () => {
      expect(
        adapter.canHandle('123 main st, frederick, md 21704'),
      ).toBe(true);
    });

    it('should not match MD embedded in a word', () => {
      expect(adapter.canHandle('123 EDMDALE ST, RICHMOND')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should call parser.parsePropertyPage with the raw HTML', () => {
      const mockResult = createMockParserResult();
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(mockResult);

      adapter.parse('<html>test</html>');

      expect(mockParser.parsePropertyPage).toHaveBeenCalledWith(
        '<html>test</html>',
      );
    });

    it('should map premisesAddress to address', () => {
      const mockResult = createMockParserResult({
        premisesAddress: '8933 AMELUNG ST, FREDERICK 21704-7918',
      });
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(mockResult);

      const parsed = adapter.parse('<html></html>');

      expect(parsed.address).toBe(
        '8933 AMELUNG ST, FREDERICK 21704-7918',
      );
    });

    it('should set state to MD', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult(),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.state).toBe('MD');
    });

    it('should extract city from premises address', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          premisesAddress: '8933 AMELUNG ST, FREDERICK 21704-7918',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.city).toBe('FREDERICK');
    });

    it('should extract zip code from premises address', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          premisesAddress: '8933 AMELUNG ST, FREDERICK 21704-7918',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.zipCode).toBe('21704-7918');
    });

    it('should extract 5-digit zip code without extension', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          premisesAddress: '100 MAIN ST, ROCKVILLE 20850',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.zipCode).toBe('20850');
      expect(parsed.city).toBe('ROCKVILLE');
    });

    it('should handle premises address with no zip code', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          premisesAddress: '100 MAIN ST, ROCKVILLE',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.city).toBe('');
      expect(parsed.zipCode).toBe('');
    });

    it('should handle empty premises address', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          premisesAddress: '',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.city).toBe('');
      expect(parsed.zipCode).toBe('');
    });

    it('should join owner names with comma separator', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          ownerNames: ['CHEN KEQIANG', 'WANG HONGDI'],
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.ownerNames).toBe('CHEN KEQIANG, WANG HONGDI');
    });

    it('should handle single owner name', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          ownerNames: ['MONTGOMERY CO'],
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.ownerNames).toBe('MONTGOMERY CO');
    });

    it('should map propertyUse to propertyType', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ propertyUse: 'TOWN HOUSE' }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.propertyType).toBe('TOWN HOUSE');
    });

    it('should map yearBuilt', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ yearBuilt: 2008 }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.yearBuilt).toBe(2008);
    });

    it('should map yearBuilt as undefined when null', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ yearBuilt: null }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.yearBuilt).toBeUndefined();
    });

    it('should map aboveGradeLivingArea to squareFootage', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ aboveGradeLivingArea: 1868 }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.squareFootage).toBe(1868);
    });

    it('should map squareFootage as undefined when aboveGradeLivingArea is null', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ aboveGradeLivingArea: null }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.squareFootage).toBeUndefined();
    });

    it('should parse lotSize from landArea string', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ landArea: '1,592 SF' }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.lotSize).toBe(1592);
    });

    it('should set lotSize undefined when landArea is empty', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ landArea: '' }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.lotSize).toBeUndefined();
    });

    it('should set lotSize undefined when landArea has no digits', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ landArea: 'N/A' }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.lotSize).toBeUndefined();
    });

    it('should map stories', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ stories: 3 }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.stories).toBe(3);
    });

    it('should map basement true to YES', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ basement: true }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.basement).toBe('YES');
    });

    it('should map basement false to NO', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ basement: false }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.basement).toBe('NO');
    });

    it('should map garageSpaces', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ garageSpaces: 1 }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.garageSpaces).toBe(1);
    });

    it('should map garageSpaces as undefined when null', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ garageSpaces: null }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.garageSpaces).toBeUndefined();
    });

    it('should map lastSaleDate and lastSalePrice from first transfer', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          transfers: [
            {
              seller: 'KONAI  KELLY L',
              date: '01/04/2017',
              price: 333000,
              type: 'ARMS LENGTH IMPROVED',
              deedRef1: '/11593/ 00095',
              deedRef2: '',
            },
          ],
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.lastSaleDate).toBe('01/04/2017');
      expect(parsed.lastSalePrice).toBe(333000);
    });

    it('should handle empty transfers for lastSaleDate/lastSalePrice', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({ transfers: [] }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.lastSaleDate).toBeUndefined();
      expect(parsed.lastSalePrice).toBeUndefined();
    });

    it('should map transfers to saleHistory', () => {
      const mockResult = createMockParserResult({
        transfers: [
          {
            seller: 'KONAI  KELLY L',
            date: '01/04/2017',
            price: 333000,
            type: 'ARMS LENGTH IMPROVED',
            deedRef1: '/11593/ 00095',
            deedRef2: '',
          },
          {
            seller: 'MONOCACY LAND COMPANY, LLC.',
            date: '04/17/2008',
            price: 329090,
            type: 'ARMS LENGTH IMPROVED',
            deedRef1: '/06953/ 00083',
            deedRef2: '',
          },
        ],
      });
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(mockResult);

      const parsed = adapter.parse('<html></html>');

      expect(parsed.saleHistory).toHaveLength(2);
      expect(parsed.saleHistory![0]).toEqual({
        date: '01/04/2017',
        price: 333000,
        seller: 'KONAI  KELLY L',
        type: 'ARMS LENGTH IMPROVED',
        deedRef: '/11593/ 00095',
      });
      expect(parsed.saleHistory![1]).toEqual({
        date: '04/17/2008',
        price: 329090,
        seller: 'MONOCACY LAND COMPANY, LLC.',
        type: 'ARMS LENGTH IMPROVED',
        deedRef: '/06953/ 00083',
      });
    });

    it('should filter out transfers with empty date from saleHistory', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          transfers: [
            {
              seller: 'SELLER A',
              date: '01/04/2017',
              price: 100000,
              type: 'ARMS LENGTH',
              deedRef1: '/123/ 456',
              deedRef2: '',
            },
            {
              seller: 'SELLER B',
              date: '',
              price: 0,
              type: '',
              deedRef1: '',
              deedRef2: '',
            },
          ],
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.saleHistory).toHaveLength(1);
      expect(parsed.saleHistory![0].seller).toBe('SELLER A');
    });

    it('should build taxAssessments from currentValue when total > 0', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          currentValue: { land: 170000, improvements: 385300, total: 555300 },
        }),
      );

      const parsed = adapter.parse('<html></html>');
      const currentYear = new Date().getFullYear().toString();

      expect(parsed.taxAssessments).toBeDefined();
      expect(parsed.taxAssessments![currentYear]).toEqual({
        land: 170000,
        improvements: 385300,
        total: 555300,
      });
    });

    it('should not create taxAssessments entry when currentValue total is 0', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          currentValue: { land: 0, improvements: 0, total: 0 },
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.taxAssessments).toEqual({});
    });

    it('should map legalDescription', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          legalDescription: 'LOT 1287 VILLAGES OF URBANA',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.legalDescription).toBe('LOT 1287 VILLAGES OF URBANA');
    });

    it('should map neighborhood and subdivision', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult({
          neighborhood: '7030030.11',
          subdivisionCode: '0000',
        }),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.neighborhood).toBe('7030030.11');
      expect(parsed.subdivision).toBe('0000');
    });

    it('should set county to undefined (caller provides)', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult(),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.county).toBeUndefined();
    });

    it('should set rawHtml to empty string', () => {
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(
        createMockParserResult(),
      );

      const parsed = adapter.parse('<html></html>');

      expect(parsed.rawHtml).toBe('');
    });

    it('should include siteSpecificData with SDAT-specific fields', () => {
      const mockResult = createMockParserResult();
      vi.mocked(mockParser.parsePropertyPage).mockReturnValue(mockResult);

      const parsed = adapter.parse('<html></html>');

      expect(parsed.siteSpecificData).toBeDefined();
      expect(parsed.siteSpecificData!.accountId).toBe('07-247192');
      expect(parsed.siteSpecificData!.district).toBe('07');
      expect(parsed.siteSpecificData!.principalResidence).toBe(true);
      expect(parsed.siteSpecificData!.fullBaths).toBe(2);
      expect(parsed.siteSpecificData!.halfBaths).toBe(2);
      expect(parsed.siteSpecificData!.garageType).toBe('Attached');
      expect(parsed.siteSpecificData!.exterior).toBe('BRICK');
      expect(parsed.siteSpecificData!.quality).toBe('5');
      expect(parsed.siteSpecificData!.structureType).toBe('END UNIT');
      expect(parsed.siteSpecificData!.homesteadStatus).toBe('Approved');
      expect(parsed.siteSpecificData!.homesteadApplicationDate).toBe(
        '09/18/2017',
      );
    });
  });
});
