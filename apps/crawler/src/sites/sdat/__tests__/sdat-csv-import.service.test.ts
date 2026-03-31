import { describe, it, expect } from 'vitest';
import {
  parseLotSize,
  parseDescStyle,
  parseCoordinates,
  parseTraDate,
  CsvRow,
  CsvToCopyTransform,
  ImportOptions,
} from '../sdat-csv-import.service';

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

/** Helper to push a row through CsvToCopyTransform and get the output line */
function transformRow(row: CsvRow): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const transform = new CsvToCopyTransform();
    let output = '';
    transform.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    transform.on('end', () => {
      resolve(output || null);
    });
    transform.on('error', reject);
    transform.write(row);
    transform.end();
  });
}

/** Parse a COPY output line into field array */
function parseCopyLine(line: string): string[] {
  // Remove trailing newline and split by tab
  return line.trimEnd().split('\t');
}

describe('CsvToCopyTransform', () => {
  it('transforms Amelung row into tab-delimited COPY line', async () => {
    const output = await transformRow(amelungRow);
    expect(output).not.toBeNull();

    const fields = parseCopyLine(output!);
    // Should have 30 fields (matching STAGING_COLUMNS count)
    expect(fields).toHaveLength(30);

    // address (lowercased)
    expect(fields[0]).toBe('8933 amelung st');
    // city
    expect(fields[1]).toBe('FREDERICK');
    // zip_code
    expect(fields[2]).toBe('21704');
    // county (resolved from JURSCODE)
    expect(fields[3]).toBe('FREDERICK');
    // owner_name_1
    expect(fields[4]).toBe('CHEN KEQIANG');
    // owner_name_2
    expect(fields[5]).toBe('WANG HONGDI');
    // property_type
    expect(fields[6]).toBe('Town House');
    // year_built
    expect(fields[7]).toBe('2008');
    // square_footage
    expect(fields[8]).toBe('1868');
    // land_area
    expect(fields[9]).toBe('1592');
    // land_unit
    expect(fields[10]).toBe('S');
    // bldg_story (0 → null)
    expect(fields[11]).toBe('\\N');
    // desc_style
    expect(fields[12]).toBe('STRY Townhouse-End Unit 3 Story No Basement');
    // ooi
    expect(fields[13]).toBe('H');
  });

  it('converts coordinates from Web Mercator to WGS84', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);

    // latitude (field 19), longitude (field 20)
    const lat = parseFloat(fields[19]);
    const lon = parseFloat(fields[20]);
    expect(lat).toBeGreaterThan(39.0);
    expect(lat).toBeLessThan(40.0);
    expect(lon).toBeGreaterThan(-78.0);
    expect(lon).toBeLessThan(-77.0);
  });

  it('converts sale date from YYYYMMDD to YYYY-MM-DD', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // sale_date (field 21)
    expect(fields[21]).toBe('2017-01-04');
  });

  it('includes sale price and seller', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // sale_price (field 22)
    expect(fields[22]).toBe('333000');
    // seller (field 23)
    expect(fields[23]).toBe('KONAI  KELLY L');
  });

  it('includes tax assessment values', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // nfm_land_value (field 25)
    expect(fields[25]).toBe('170000');
    // nfm_improvement_value (field 26)
    expect(fields[26]).toBe('385300');
    // nfm_total_value (field 27)
    expect(fields[27]).toBe('555300');
  });

  it('skips rows with no ADDRESS and no PREMSNUM/PREMSNAM', async () => {
    const output = await transformRow({ ...amelungRow, ADDRESS: '', PREMSNUM: '', PREMSNAM: '' });
    expect(output).toBeNull();
  });

  it('falls back to PREMSNUM + PREMSNAM when ADDRESS is empty', async () => {
    const row: CsvRow = {
      ...amelungRow,
      ADDRESS: '',
      PREMSNUM: '9354',
      PREMSNAM: 'WESTERING SUN',
      PREMCITY: 'COLUMBIA',
      PREMZIP: '21045',
      CITY: '',
      ZIPCODE: '',
    };
    const output = await transformRow(row);
    expect(output).not.toBeNull();

    const fields = parseCopyLine(output!);
    // address constructed from premise fields (lowercased)
    expect(fields[0]).toBe('9354 westering sun');
    // city falls back to PREMCITY
    expect(fields[1]).toBe('COLUMBIA');
    // zip falls back to PREMZIP
    expect(fields[2]).toBe('21045');
  });

  it('outputs \\N for null fields', async () => {
    const row: CsvRow = {
      ADDRESS: '100 TEST ST',
      CITY: '',
      ZIPCODE: '',
      JURSCODE: 'ZZZZ', // unknown → null county
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

    const output = await transformRow(row);
    expect(output).not.toBeNull();

    const fields = parseCopyLine(output!);
    // address is set
    expect(fields[0]).toBe('100 test st');
    // city is null
    expect(fields[1]).toBe('\\N');
    // county is null (unknown JURSCODE)
    expect(fields[3]).toBe('\\N');
    // year_built is null (0)
    expect(fields[7]).toBe('\\N');
  });

  it('stores only unmapped fields in raw_data', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // raw_data is the last field (field 29)
    const rawData = JSON.parse(fields[29]);
    // OBJECTID and RESITYP should be in raw_data (not mapped)
    expect(rawData.OBJECTID).toBe('1263827');
    expect(rawData.RESITYP).toBe('TH');
    // Mapped fields should NOT be in raw_data
    expect(rawData.ADDRESS).toBeUndefined();
    expect(rawData.CITY).toBeUndefined();
    expect(rawData.ZIPCODE).toBeUndefined();
  });

  it('escapes tabs and newlines in values', async () => {
    const row: CsvRow = {
      ...amelungRow,
      OWNNAME1: 'NAME\tWITH\tTABS',
      OWNNAME2: 'NAME\nWITH\nNEWLINES',
    };
    const output = await transformRow(row);
    const fields = parseCopyLine(output!);
    // tabs/newlines should be escaped
    expect(fields[4]).toBe('NAME\\tWITH\\tTABS');
    expect(fields[5]).toBe('NAME\\nWITH\\nNEWLINES');
  });

  it('tracks totalRows and errorCount via getStats()', async () => {
    const transform = new CsvToCopyTransform();
    const chunks: string[] = [];
    transform.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));

    await new Promise<void>((resolve, reject) => {
      transform.write(amelungRow);
      transform.write({ ...amelungRow, ADDRESS: '' }); // skipped
      transform.write({ ...amelungRow, ADDRESS: '456 OAK ST' });
      transform.end(() => resolve());
      transform.on('error', reject);
    });

    const stats = transform.getStats();
    expect(stats.totalRows).toBe(3);
    expect(stats.errorCount).toBe(0);
    // 2 rows had addresses, so 2 output chunks
    expect(chunks).toHaveLength(2);
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

describe('JURISDICTION_CODES mapping via CsvToCopyTransform', () => {
  it('maps all 24 Maryland jurisdictions', async () => {
    const fredRow = { ...createMinimalRow(), JURSCODE: 'FRED' };
    const output = await transformRow(fredRow);
    expect(parseCopyLine(output!)[3]).toBe('FREDERICK');

    const montRow = { ...createMinimalRow(), JURSCODE: 'MONT' };
    const output2 = await transformRow(montRow);
    expect(parseCopyLine(output2!)[3]).toBe('MONTGOMERY');

    const baciRow = { ...createMinimalRow(), JURSCODE: 'BACI' };
    const output3 = await transformRow(baciRow);
    expect(parseCopyLine(output3!)[3]).toBe('BALTIMORE CITY');

    const prinRow = { ...createMinimalRow(), JURSCODE: 'PRIN' };
    const output4 = await transformRow(prinRow);
    expect(parseCopyLine(output4!)[3]).toBe("PRINCE GEORGE'S");

    const anneRow = { ...createMinimalRow(), JURSCODE: 'ANNE' };
    const output5 = await transformRow(anneRow);
    expect(parseCopyLine(output5!)[3]).toBe('ANNE ARUNDEL');
  });

  it('returns \\N for unknown JURSCODE', async () => {
    const row = { ...createMinimalRow(), JURSCODE: 'ZZZZ' };
    const output = await transformRow(row);
    expect(parseCopyLine(output!)[3]).toBe('\\N');
  });
});

describe('ImportOptions', () => {
  it('ImportOptions interface accepts dry run', () => {
    const opts: ImportOptions = { dryRun: true };
    expect(opts.dryRun).toBe(true);
  });

  it('ImportOptions defaults are undefined', () => {
    const opts: ImportOptions = {};
    expect(opts.dryRun).toBeUndefined();
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
