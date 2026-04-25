import { describe, it, expect } from 'vitest';
import {
  parseLotSize,
  parseDescStyle,
  parseCoordinates,
  parseTraDate,
  buildAddress,
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
  // Parcel IDs
  MAP: '0096',
  GRID: '0009',
  PARCEL: '0249',
  SECTION: 'M1B',
  BLOCK: '',
  LOT: '1287',
  // Owner mailing address
  OWNADD1: '8933 AMELUNG ST',
  OWNADD2: '',
  OWNCITY: 'FREDERICK',
  OWNSTATE: 'MD',
  OWNERZIP: '21704',
  OWNZIP2: '7918',
  // Construction
  DESCCNST: 'CNST Brick',
  STRUGRAD: '5',
  DESCGRAD: 'Codes range from lowest to highest quality 1-9',
  // Deed references
  DR1LIBER: '11593',
  DR1FOLIO: '0095',
  GR1LIBR1: '06953',
  GR1FOLO1: '0083',
  // Mortgage
  MORTGAG1: '',
  // Homestead
  HOMQLCOD: '1',
  HOMQLDAT: '20170918',
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
    // Should have 51 fields (matching STAGING_COLUMNS count: 30 original + 21 new)
    expect(fields).toHaveLength(51);

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

  it('skips rows with no address columns at all', async () => {
    const row = { ...createMinimalRow(), ADDRESS: '' };
    const output = await transformRow(row);
    expect(output).toBeNull();
  });

  it('falls back to STRT* columns when ADDRESS is empty', async () => {
    const row: CsvRow = {
      ...createMinimalRow(),
      ADDRESS: '',
      STRTNUM: '8931',
      STRTNAM: 'AMELUNG',
      STRTTYP: 'ST',
    };
    const output = await transformRow(row);
    expect(output).not.toBeNull();
    const fields = parseCopyLine(output!);
    expect(fields[0]).toBe('8931 amelung st');
  });

  it('includes STRTDIR in address when present', async () => {
    const row: CsvRow = {
      ...createMinimalRow(),
      ADDRESS: '',
      STRTNUM: '100',
      STRTDIR: 'N',
      STRTNAM: 'MAIN',
      STRTTYP: 'ST',
    };
    const output = await transformRow(row);
    expect(output).not.toBeNull();
    const fields = parseCopyLine(output!);
    expect(fields[0]).toBe('100 n main st');
  });

  it('falls back to PREMS* when ADDRESS and STRT* are empty', async () => {
    const row: CsvRow = {
      ...createMinimalRow(),
      ADDRESS: '',
      PREMSNUM: '8931',
      PREMSNAM: 'AMELUNG',
      PREMSTYP: 'ST',
      PREMCITY: 'FREDERICK',
      PREMZIP: '21704',
      CITY: '',
      ZIPCODE: '',
    };
    const output = await transformRow(row);
    expect(output).not.toBeNull();
    const fields = parseCopyLine(output!);
    expect(fields[0]).toBe('8931 amelung st');
    expect(fields[1]).toBe('FREDERICK');
    expect(fields[2]).toBe('21704');
  });

  it('falls back city/zip to PREMCITY/PREMZIP', async () => {
    const row: CsvRow = {
      ...createMinimalRow(),
      CITY: '',
      ZIPCODE: '',
      PREMCITY: 'FREDERICK',
      PREMZIP: '21704',
    };
    const output = await transformRow(row);
    expect(output).not.toBeNull();
    const fields = parseCopyLine(output!);
    expect(fields[1]).toBe('FREDERICK');
    expect(fields[2]).toBe('21704');
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

  it('includes parcel IDs at correct indices', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // map(29), grid(30), parcel(31), section(32), block(33), lot(34)
    expect(fields[29]).toBe('0096');
    expect(fields[30]).toBe('0009');
    expect(fields[31]).toBe('0249');
    expect(fields[32]).toBe('M1B');
    expect(fields[33]).toBe('\\N'); // empty BLOCK → null
    expect(fields[34]).toBe('1287');
  });

  it('includes owner mailing address at correct indices', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // owner_address_1(35), owner_address_2(36), owner_city(37),
    // owner_state(38), owner_zip(39), owner_zip2(40)
    expect(fields[35]).toBe('8933 AMELUNG ST');
    expect(fields[36]).toBe('\\N'); // empty → null
    expect(fields[37]).toBe('FREDERICK');
    expect(fields[38]).toBe('MD');
    expect(fields[39]).toBe('21704');
    expect(fields[40]).toBe('7918');
  });

  it('includes construction material and grade', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // construction_material(41), construction_grade(42)
    expect(fields[41]).toBe('CNST Brick');
    expect(fields[42]).toBe('Codes range from lowest to highest quality 1-9');
  });

  it('falls back construction grade to STRUGRAD when DESCGRAD empty', async () => {
    const row: CsvRow = {
      ...amelungRow,
      DESCGRAD: '',
      STRUGRAD: '5',
    };
    const output = await transformRow(row);
    const fields = parseCopyLine(output!);
    expect(fields[42]).toBe('5');
  });

  it('includes deed references at correct indices', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // deed_liber(43), deed_folio(44), grantor_liber(45), grantor_folio(46)
    expect(fields[43]).toBe('11593');
    expect(fields[44]).toBe('0095');
    expect(fields[45]).toBe('06953');
    expect(fields[46]).toBe('0083');
  });

  it('includes mortgage amount (null when empty)', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // mortgage_amount(47) — empty in fixture → null
    expect(fields[47]).toBe('\\N');
  });

  it('parses mortgage amount when present', async () => {
    const row: CsvRow = { ...amelungRow, MORTGAG1: '266400' };
    const output = await transformRow(row);
    const fields = parseCopyLine(output!);
    expect(fields[47]).toBe('266400');
  });

  it('includes homestead code and parsed date', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // homestead_code(48), homestead_date(49)
    expect(fields[48]).toBe('1');
    expect(fields[49]).toBe('2017-09-18');
  });

  it('outputs \\N for all new fields when empty', async () => {
    const row = createMinimalRow();
    const output = await transformRow(row);
    const fields = parseCopyLine(output!);
    // New fields at indices 29-49 should all be \N
    for (let i = 29; i <= 49; i++) {
      expect(fields[i]).toBe('\\N');
    }
  });

  it('stores only unmapped fields in raw_data', async () => {
    const output = await transformRow(amelungRow);
    const fields = parseCopyLine(output!);
    // raw_data is the last field at index 50 (51 total fields)
    const rawData = JSON.parse(fields[50]);
    // OBJECTID and RESITYP should be in raw_data (not mapped)
    expect(rawData.OBJECTID).toBe('1263827');
    expect(rawData.RESITYP).toBe('TH');
    // Mapped fields should NOT be in raw_data
    expect(rawData.ADDRESS).toBeUndefined();
    expect(rawData.CITY).toBeUndefined();
    expect(rawData.ZIPCODE).toBeUndefined();
    // Newly mapped fields should NOT be in raw_data either
    expect(rawData.MAP).toBeUndefined();
    expect(rawData.GRID).toBeUndefined();
    expect(rawData.OWNADD1).toBeUndefined();
    expect(rawData.DESCCNST).toBeUndefined();
    expect(rawData.DR1LIBER).toBeUndefined();
    expect(rawData.HOMQLCOD).toBeUndefined();
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

describe('buildAddress', () => {
  it('returns ADDRESS when present', () => {
    expect(buildAddress({ ADDRESS: '8933 AMELUNG ST' })).toBe('8933 AMELUNG ST');
  });

  it('builds from STRT* when ADDRESS is empty', () => {
    expect(buildAddress({ ADDRESS: '', STRTNUM: '8931', STRTNAM: 'AMELUNG', STRTTYP: 'ST' }))
      .toBe('8931 AMELUNG ST');
  });

  it('includes STRTDIR and STRTSFX', () => {
    expect(buildAddress({ ADDRESS: '', STRTNUM: '100', STRTDIR: 'N', STRTNAM: 'MAIN', STRTTYP: 'ST', STRTSFX: 'W' }))
      .toBe('100 N MAIN ST W');
  });

  it('builds from PREMS* when ADDRESS and STRT* are empty', () => {
    expect(buildAddress({ ADDRESS: '', PREMSNUM: '8931', PREMSNAM: 'AMELUNG', PREMSTYP: 'ST' }))
      .toBe('8931 AMELUNG ST');
  });

  it('includes PREMSDIR', () => {
    expect(buildAddress({ ADDRESS: '', PREMSNUM: '100', PREMSDIR: 'N', PREMSNAM: 'MAIN' }))
      .toBe('100 N MAIN');
  });

  it('returns null when all address fields are empty', () => {
    expect(buildAddress({ ADDRESS: '' })).toBeNull();
  });

  it('prefers STRT* over PREMS*', () => {
    expect(buildAddress({
      ADDRESS: '',
      STRTNUM: '100', STRTNAM: 'OAK',
      PREMSNUM: '200', PREMSNAM: 'ELM',
    })).toBe('100 OAK');
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
    STRTNUM: '',
    STRTDIR: '',
    STRTNAM: '',
    STRTTYP: '',
    STRTSFX: '',
    PREMSNUM: '',
    PREMSDIR: '',
    PREMSNAM: '',
    PREMSTYP: '',
    PREMCITY: '',
    PREMZIP: '',
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
    // New fields
    MAP: '',
    GRID: '',
    PARCEL: '',
    SECTION: '',
    BLOCK: '',
    LOT: '',
    OWNADD1: '',
    OWNADD2: '',
    OWNCITY: '',
    OWNSTATE: '',
    OWNERZIP: '',
    OWNZIP2: '',
    DESCCNST: '',
    STRUGRAD: '',
    DESCGRAD: '',
    DR1LIBER: '',
    DR1FOLIO: '',
    GR1LIBR1: '',
    GR1FOLO1: '',
    MORTGAG1: '',
    HOMQLCOD: '',
    HOMQLDAT: '',
  };
}
