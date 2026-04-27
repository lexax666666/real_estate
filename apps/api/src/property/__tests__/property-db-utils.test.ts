import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyDbService } from '../property-db.service';

const addressParserMock = {
  parseAddress: () => ({ streetAddress: '', city: null, state: null, zip: null, fullAddress: '' }),
  tokenizeSearchInput: () => [],
  classifyToken: () => 'word',
  expandAbbreviations: (t: string) => [t],
};

let service: PropertyDbService;

beforeEach(() => {
  service = new PropertyDbService(null as any, addressParserMock as any);
});

describe('PropertyDbService - reconstructApiResponse', () => {
  it('should convert tax assessments array to year-keyed object', () => {
    const prop = {
      taxAssessments: [
        { year: 2022, landValue: '100000', improvementValue: '200000', totalValue: '300000' },
        { year: 2023, landValue: '110000', improvementValue: '210000', totalValue: '320000' },
      ],
      propertyTaxes: [],
      saleHistory: [],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.taxAssessments).toEqual({
      '2022': { land: 100000, improvements: 200000, value: 300000 },
      '2023': { land: 110000, improvements: 210000, value: 320000 },
    });
  });

  it('should convert property taxes array to year-keyed object', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [
        { year: 2022, total: '4500' },
        { year: 2023, total: '4800' },
      ],
      saleHistory: [],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.propertyTaxes).toEqual({
      '2022': { total: 4500 },
      '2023': { total: 4800 },
    });
  });

  it('should map sale history records', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [
        {
          saleDate: '2020-01-15',
          salePrice: 350000,
          buyer: 'Buyer A',
          seller: 'Seller B',
          documentType: 'Deed',
          recordingDate: '2020-02-01',
        },
        {
          saleDate: '2015-06-20',
          salePrice: 280000,
          buyer: 'Buyer C',
          seller: 'Seller D',
          documentType: 'Warranty',
          recordingDate: '2015-07-01',
        },
      ],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.history).toEqual([
      {
        date: '2020-01-15',
        price: 350000,
        buyer: 'Buyer A',
        seller: 'Seller B',
        documentType: 'Deed',
        recordingDate: '2020-02-01',
      },
      {
        date: '2015-06-20',
        price: 280000,
        buyer: 'Buyer C',
        seller: 'Seller D',
        documentType: 'Warranty',
        recordingDate: '2015-07-01',
      },
    ]);
  });

  it('should calculate latest assessment year and use it for assessedValue', () => {
    const prop = {
      taxAssessments: [
        { year: 2020, landValue: '80000', improvementValue: '160000', totalValue: '240000' },
        { year: 2023, landValue: '110000', improvementValue: '210000', totalValue: '320000' },
        { year: 2021, landValue: '90000', improvementValue: '170000', totalValue: '260000' },
      ],
      propertyTaxes: [
        { year: 2020, total: '3500' },
        { year: 2023, total: '4800' },
      ],
      saleHistory: [],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.assessedDate).toBe(2023);
    expect(result.assessedValue).toEqual({
      land: 110000,
      building: 210000,
      total: 320000,
    });
    expect(result.taxAmount).toBe(4800);
  });

  it('should return empty objects for empty arrays', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.taxAssessments).toEqual({});
    expect(result.propertyTaxes).toEqual({});
    expect(result.history).toEqual([]);
    expect(result.assessedDate).toBeNull();
    expect(result.assessedValue).toEqual({ land: 0, building: 0, total: 0 });
    expect(result.taxAmount).toBeUndefined();
  });

  it('should return empty objects when taxAssessments and propertyTaxes are null', () => {
    const prop = {
      taxAssessments: null,
      propertyTaxes: null,
      saleHistory: null,
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.taxAssessments).toEqual({});
    expect(result.propertyTaxes).toEqual({});
    expect(result.history).toEqual([]);
  });

  it('should pass through all new fields', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      formattedAddress: '123 Main St',
      city: 'Columbia',
      state: 'MD',
      zipCode: '21045',
      ownerNames: 'John Doe',
      propertyType: 'Single Family',
      yearBuilt: 2000,
      squareFootage: 2500,
      lotSize: 5000,
      bedrooms: 4,
      bathrooms: '2.5',
      stories: 2,
      basement: true,
      garageSpaces: 2,
      lastSaleDate: '2020-01-15',
      lastSalePrice: 350000,
      neighborhood: 'Hickory Ridge',
      subdivision: 'Westering Sun',
      county: 'Howard',
      latitude: '39.2',
      longitude: '-76.8',
      hoaFee: '150',
      features: { floorCount: 2 },
      ownerOccupied: true,
      zoning: 'R-1',
      assessorId: 'ABC123',
      legalDescription: 'Lot 10 Block A',
      // New fields
      map: 'MAP-001',
      grid: 'GRID-A',
      parcel: 'PARCEL-123',
      section: 'SEC-1',
      lot: 'LOT-10',
      block: 'BLK-A',
      constructionMaterial: 'Brick',
      constructionGrade: 'A+',
      deedLiber: 'DL-100',
      deedFolio: 'DF-200',
      grantorLiber: 'GL-300',
      grantorFolio: 'GF-400',
      mortgageAmount: 250000,
      homesteadStatus: 'Active',
      homesteadDate: '2018-05-01',
      ownerAddress1: '123 Owner St',
      ownerAddress2: 'Suite 100',
      ownerCity: 'Baltimore',
      ownerState: 'MD',
      ownerZip: '21201',
      ownerZip2: '1234',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.map).toBe('MAP-001');
    expect(result.grid).toBe('GRID-A');
    expect(result.parcel).toBe('PARCEL-123');
    expect(result.section).toBe('SEC-1');
    expect(result.lot).toBe('LOT-10');
    expect(result.block).toBe('BLK-A');
    expect(result.exterior).toBe('Brick');
    expect(result.quality).toBe('A+');
    expect(result.deedLiber).toBe('DL-100');
    expect(result.deedFolio).toBe('DF-200');
    expect(result.grantorLiber).toBe('GL-300');
    expect(result.grantorFolio).toBe('GF-400');
    expect(result.mortgageAmount).toBe(250000);
    expect(result.homesteadStatus).toBe('Active');
    expect(result.homesteadDate).toBe('2018-05-01');
    expect(result.ownerAddress1).toBe('123 Owner St');
    expect(result.ownerAddress2).toBe('Suite 100');
    expect(result.ownerCity).toBe('Baltimore');
    expect(result.ownerState).toBe('MD');
    expect(result.ownerZip).toBe('21201');
    expect(result.ownerZip2).toBe('1234');
  });

  it('should parse latitude and longitude as floats', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      latitude: '39.2034',
      longitude: '-76.8512',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.latitude).toBe(39.2034);
    expect(result.longitude).toBe(-76.8512);
  });

  it('should return null for latitude/longitude when not provided', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      latitude: null,
      longitude: null,
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it('should parse bathrooms as float', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      bathrooms: '2.5',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.bathrooms).toBe(2.5);
  });

  it('should return null for bathrooms when not provided', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      bathrooms: null,
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.bathrooms).toBeNull();
  });

  it('should parse hoaFee as float', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      hoaFee: '150.50',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.hoaFee).toBe(150.50);
  });

  it('should prefer formattedAddress over address for the address field', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      formattedAddress: '123 Main St, Columbia, MD',
      address: '123 main st',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.address).toBe('123 Main St, Columbia, MD');
  });

  it('should fall back to address when formattedAddress is null', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      formattedAddress: null,
      address: '123 main st',
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.address).toBe('123 main st');
  });

  it('should default ownerName to N/A when ownerNames is not provided', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      ownerNames: null,
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.ownerName).toBe('N/A');
  });

  it('should default propertyType to Residential when not provided', () => {
    const prop = {
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
      propertyType: null,
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.propertyType).toBe('Residential');
  });

  it('should handle zero values in tax assessment fields', () => {
    const prop = {
      taxAssessments: [
        { year: 2023, landValue: '0', improvementValue: '0', totalValue: '0' },
      ],
      propertyTaxes: [
        { year: 2023, total: '0' },
      ],
      saleHistory: [],
    };

    const result = service['reconstructApiResponse'](prop);

    expect(result.taxAssessments['2023']).toEqual({
      land: 0,
      improvements: 0,
      value: 0,
    });
    expect(result.propertyTaxes['2023']).toEqual({ total: 0 });
  });
});

describe('PropertyDbService - isCacheFresh', () => {
  it('should return true for a recent date', () => {
    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago

    expect(service.isCacheFresh(recentDate)).toBe(true);
  });

  it('should return false for an old date', () => {
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 48); // 48 hours ago

    expect(service.isCacheFresh(oldDate)).toBe(false);
  });

  it('should return true when date is exactly within default 24 hour window', () => {
    const almostExpired = new Date();
    almostExpired.setHours(almostExpired.getHours() - 23); // 23 hours ago

    expect(service.isCacheFresh(almostExpired)).toBe(true);
  });

  it('should respect custom maxAgeHours', () => {
    const date = new Date();
    date.setHours(date.getHours() - 5); // 5 hours ago

    expect(service.isCacheFresh(date, 4)).toBe(false);
    expect(service.isCacheFresh(date, 6)).toBe(true);
  });

  it('should return true for a date that is now', () => {
    expect(service.isCacheFresh(new Date())).toBe(true);
  });

  it('should handle date passed as string-like value via new Date()', () => {
    // isCacheFresh wraps updatedAt in new Date(), so string dates work
    const recentISO = new Date(Date.now() - 3600000).toISOString();
    expect(service.isCacheFresh(new Date(recentISO))).toBe(true);
  });
});
