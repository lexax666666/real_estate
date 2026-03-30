import { describe, it, expect } from 'vitest';
import {
  parseCsvRow,
  parseLotSize,
  parseDescStyle,
  parseCoordinates,
  parseTraDate,
  CsvRow,
} from '../sdat-csv-import.service';

describe('parseCsvRow', () => {
  /** Fixture: 8933 Amelung St, Frederick MD — real CSV row */
  const amelungRow: CsvRow = {
    X: '-8611425.017',
    Y: '4769258.7121',
    OBJECTID: '1263827',
    JURSCODE: 'FRED',
    ACCTID: '1107247192',
    OOI: 'H',
    RESITYP: 'TH',
    ADDRESS: '8933 AMELUNG ST',
    CITY: 'FREDERICK',
    ZIPCODE: '21704',
    OWNNAME1: 'CHEN KEQIANG',
    OWNNAME2: 'WANG HONGDI',
    DESCLU: 'Town House',
    YEARBLT: '2008',
    SQFTSTRC: '1868',
    LANDAREA: '1592',
    LUOM: 'S',
    BLDG_STORY: '0',
    DESCSTYL: 'STRY Townhouse-End Unit 3 Story No Basement',
    LEGAL1: 'IMPSLOT 1287 SECT M-1B',
    LEGAL2: '1,592 SQ. FT.',
    LEGAL3: 'VILLAGES OF URBANA',
    ZONING: '',
    TRADATE: '20170104',
    CONSIDR1: '333000',
    GRNTNAM1: 'KONAI  KELLY L',
    CONVEY1: '1',
    NFMLNDVL: '170000',
    NFMIMPVL: '385300',
    NFMTTLVL: '555300',
    DESCSUBD: 'Villages of Urbana',
  };

  it('parses 8933 Amelung ST row correctly', () => {
    const result = parseCsvRow(amelungRow);
    expect(result).not.toBeNull();

    expect(result!.address).toBe('8933 AMELUNG ST');
    expect(result!.city).toBe('FREDERICK');
    expect(result!.state).toBe('MD');
    expect(result!.zipCode).toBe('21704');
    expect(result!.county).toBe('FREDERICK');
    expect(result!.ownerNames).toBe('CHEN KEQIANG, WANG HONGDI');
    expect(result!.propertyType).toBe('Town House');
    expect(result!.yearBuilt).toBe(2008);
    expect(result!.squareFootage).toBe(1868);
    expect(result!.lotSize).toBe(1592); // LUOM=S → use as-is
    expect(result!.stories).toBe(3); // from DESCSTYL (BLDG_STORY=0 → fallback)
    expect(result!.basement).toBe('No');
    expect(result!.ownerOccupied).toBe(true); // OOI=H
    expect(result!.legalDescription).toBe(
      'IMPSLOT 1287 SECT M-1B 1,592 SQ. FT. VILLAGES OF URBANA',
    );
    expect(result!.assessorId).toBe('1107247192');
    expect(result!.lastSaleDate).toBe('2017-01-04');
    expect(result!.lastSalePrice).toBe(333000);
    expect(result!.subdivision).toBe('Villages of Urbana');
  });

  it('parses tax assessment correctly', () => {
    const result = parseCsvRow(amelungRow);
    expect(result!.taxAssessment).toEqual({
      land: 170000,
      improvements: 385300,
      total: 555300,
    });
  });

  it('parses sale history correctly', () => {
    const result = parseCsvRow(amelungRow);
    expect(result!.saleHistory).toEqual({
      date: '2017-01-04',
      price: 333000,
      seller: 'KONAI  KELLY L',
      documentType: '1',
    });
  });

  it('parses coordinates from Web Mercator to WGS84', () => {
    const result = parseCsvRow(amelungRow);
    // 8933 Amelung is near Frederick MD: ~39.35°N, ~77.38°W
    const lat = parseFloat(result!.latitude!);
    const lon = parseFloat(result!.longitude!);
    expect(lat).toBeGreaterThan(39.0);
    expect(lat).toBeLessThan(40.0);
    expect(lon).toBeGreaterThan(-78.0);
    expect(lon).toBeLessThan(-77.0);
  });

  it('returns null for row with no address', () => {
    const result = parseCsvRow({ ...amelungRow, ADDRESS: '' });
    expect(result).toBeNull();
  });

  it('handles missing owner2', () => {
    const result = parseCsvRow({ ...amelungRow, OWNNAME2: '' });
    expect(result!.ownerNames).toBe('CHEN KEQIANG');
  });

  it('handles both owners missing', () => {
    const result = parseCsvRow({
      ...amelungRow,
      OWNNAME1: '',
      OWNNAME2: '',
    });
    expect(result!.ownerNames).toBeNull();
  });

  it('sets yearBuilt to null for 0000', () => {
    const result = parseCsvRow({ ...amelungRow, YEARBLT: '0000' });
    expect(result!.yearBuilt).toBeNull();
  });

  it('sets squareFootage to null for 0', () => {
    const result = parseCsvRow({ ...amelungRow, SQFTSTRC: '0' });
    expect(result!.squareFootage).toBeNull();
  });

  it('handles OOI=N as not owner-occupied', () => {
    const result = parseCsvRow({ ...amelungRow, OOI: 'N' });
    expect(result!.ownerOccupied).toBe(false);
  });

  it('handles OOI=D as not owner-occupied', () => {
    const result = parseCsvRow({ ...amelungRow, OOI: 'D' });
    expect(result!.ownerOccupied).toBe(false);
  });

  it('sets ownerOccupied to null for unknown OOI', () => {
    const result = parseCsvRow({ ...amelungRow, OOI: '' });
    expect(result!.ownerOccupied).toBeNull();
  });

  it('returns null saleHistory when no sale date and price', () => {
    const row = { ...amelungRow, TRADATE: '00000000', CONSIDR1: '0' };
    const result = parseCsvRow(row);
    expect(result!.saleHistory).toBeNull();
    expect(result!.lastSaleDate).toBeNull();
    expect(result!.lastSalePrice).toBeNull();
  });

  it('returns null taxAssessment when total is 0', () => {
    const row = {
      ...amelungRow,
      NFMLNDVL: '0',
      NFMIMPVL: '0',
      NFMTTLVL: '0',
    };
    const result = parseCsvRow(row);
    expect(result!.taxAssessment).toBeNull();
  });

  it('stores raw CSV data', () => {
    const result = parseCsvRow(amelungRow);
    expect(result!.rawData.ACCTID).toBe('1107247192');
    expect(result!.rawData.JURSCODE).toBe('FRED');
  });
});

describe('parseLotSize', () => {
  it('converts acres to sqft when LUOM=A', () => {
    expect(parseLotSize('1.0', 'A')).toBe(43560);
  });

  it('returns sqft as-is when LUOM=S', () => {
    expect(parseLotSize('5000', 'S')).toBe(5000);
  });

  it('handles fractional acres', () => {
    expect(parseLotSize('0.5', 'A')).toBe(21780);
  });

  it('returns null for 0 area', () => {
    expect(parseLotSize('0', 'S')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseLotSize('', 'S')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseLotSize(undefined, undefined)).toBeNull();
  });

  it('defaults to sqft for unknown LUOM', () => {
    expect(parseLotSize('2000', '')).toBe(2000);
  });
});

describe('parseDescStyle', () => {
  it('parses "STRY Townhouse-End Unit 3 Story No Basement"', () => {
    const result = parseDescStyle(
      'STRY Townhouse-End Unit 3 Story No Basement',
    );
    expect(result.stories).toBe(3);
    expect(result.basement).toBe('No');
  });

  it('parses "STRY 2 Story With Basement"', () => {
    const result = parseDescStyle('STRY 2 Story With Basement');
    expect(result.stories).toBe(2);
    expect(result.basement).toBe('Yes');
  });

  it('parses "STRY 1 Story No Basement"', () => {
    const result = parseDescStyle('STRY 1 Story No Basement');
    expect(result.stories).toBe(1);
    expect(result.basement).toBe('No');
  });

  it('returns null for empty string', () => {
    const result = parseDescStyle('');
    expect(result.stories).toBeNull();
    expect(result.basement).toBeNull();
  });

  it('returns null for undefined', () => {
    const result = parseDescStyle(undefined);
    expect(result.stories).toBeNull();
    expect(result.basement).toBeNull();
  });

  it('handles style with no story info', () => {
    const result = parseDescStyle('HOUSING Mobile Home');
    expect(result.stories).toBeNull();
    expect(result.basement).toBeNull();
  });

  it('parses "STRY 2 Story No Basement" (from real data row 4)', () => {
    const result = parseDescStyle('STRY 2 Story No Basement');
    expect(result.stories).toBe(2);
    expect(result.basement).toBe('No');
  });
});

describe('parseCoordinates', () => {
  it('converts Web Mercator to WGS84 for Frederick MD', () => {
    const result = parseCoordinates('-8611425.017', '4769258.7121');
    const lat = parseFloat(result.latitude!);
    const lon = parseFloat(result.longitude!);
    // Frederick MD is approximately 39.35°N, 77.38°W
    expect(lat).toBeCloseTo(39.35, 1);
    expect(lon).toBeCloseTo(-77.38, 1);
  });

  it('returns null for 0,0 coordinates', () => {
    const result = parseCoordinates('0', '0');
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it('returns null for undefined', () => {
    const result = parseCoordinates(undefined, undefined);
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it('converts Worcester County coordinates', () => {
    // Row 1: Worcester County parcel
    const result = parseCoordinates('-8406508.9706', '4591997.9974');
    const lat = parseFloat(result.latitude!);
    const lon = parseFloat(result.longitude!);
    // Should be near Pocomoke City, MD (~38.08°N, ~75.55°W)
    expect(lat).toBeGreaterThan(37.5);
    expect(lat).toBeLessThan(38.5);
    expect(lon).toBeGreaterThan(-76.0);
    expect(lon).toBeLessThan(-75.0);
  });
});

describe('parseTraDate', () => {
  it('parses YYYYMMDD format', () => {
    expect(parseTraDate('20170104')).toBe('2017-01-04');
  });

  it('returns null for 00000000', () => {
    expect(parseTraDate('00000000')).toBeNull();
  });

  it('returns null for dates starting with 0000', () => {
    expect(parseTraDate('0000.00.00')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseTraDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTraDate('')).toBeNull();
  });

  it('parses date with dots', () => {
    // Some rows may have dots
    expect(parseTraDate('2021.04.09')).toBe('2021-04-09');
  });

  it('returns null for invalid month', () => {
    expect(parseTraDate('20171304')).toBeNull();
  });

  it('returns null for invalid day', () => {
    expect(parseTraDate('20170132')).toBeNull();
  });

  it('returns null for very old dates', () => {
    expect(parseTraDate('17500101')).toBeNull();
  });

  it('parses recent date', () => {
    expect(parseTraDate('20241004')).toBe('2024-10-04');
  });
});

describe('JURISDICTION_CODES mapping', () => {
  it('maps all 24 Maryland jurisdictions', () => {
    const result1 = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'FRED' });
    expect(result1!.county).toBe('FREDERICK');

    const result2 = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'MONT' });
    expect(result2!.county).toBe('MONTGOMERY');

    const result3 = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'BACI' });
    expect(result3!.county).toBe('BALTIMORE CITY');

    const result4 = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'PRIN' });
    expect(result4!.county).toBe("PRINCE GEORGE'S");

    const result5 = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'ANNE' });
    expect(result5!.county).toBe('ANNE ARUNDEL');
  });

  it('returns null for unknown JURSCODE', () => {
    const result = parseCsvRow({ ...createMinimalRow(), JURSCODE: 'ZZZZ' });
    expect(result!.county).toBeNull();
  });
});

/** Helper to create a minimal valid CSV row */
function createMinimalRow(): CsvRow {
  return {
    ADDRESS: '123 TEST ST',
    CITY: 'TEST CITY',
    ZIPCODE: '12345',
    JURSCODE: 'FRED',
    OWNNAME1: '',
    OWNNAME2: '',
    DESCLU: '',
    YEARBLT: '0',
    SQFTSTRC: '0',
    LANDAREA: '0',
    LUOM: 'S',
    BLDG_STORY: '0',
    DESCSTYL: '',
    OOI: '',
    LEGAL1: '',
    LEGAL2: '',
    LEGAL3: '',
    ZONING: '',
    ACCTID: '',
    X: '0',
    Y: '0',
    TRADATE: '',
    CONSIDR1: '0',
    GRNTNAM1: '',
    CONVEY1: '',
    NFMLNDVL: '0',
    NFMIMPVL: '0',
    NFMTTLVL: '0',
    DESCSUBD: '',
  };
}
