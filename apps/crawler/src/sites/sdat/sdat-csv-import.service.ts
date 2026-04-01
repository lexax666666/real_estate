import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform, TransformCallback } from 'stream';
import { parse } from 'csv-parse';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { JURISDICTION_CODES, MD_PARCEL_CSV_SITE_ID } from './sdat.constants';

/** Shape of a single CSV row after header mapping */
export interface CsvRow {
  [key: string]: string;
}

export interface ImportStats {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  elapsedMs: number;
}

export interface ImportOptions {
  dryRun?: boolean;
}

// --- Keep all parse helpers unchanged ---

/** Parse LANDAREA + LUOM into lot size in sqft */
export function parseLotSize(
  landArea: string | undefined,
  luom: string | undefined,
): number | null {
  const area = parseFloat(landArea ?? '');
  if (isNaN(area) || area <= 0) return null;

  const unit = luom?.trim().toUpperCase();
  if (unit === 'A') {
    return Math.round(area * 43560);
  }
  // S = square feet (or default)
  return Math.round(area);
}

/** Parse DESCSTYL to extract stories count and basement info */
export function parseDescStyle(descstyl: string | undefined): {
  stories: number | null;
  basement: string | null;
} {
  if (!descstyl) return { stories: null, basement: null };

  const text = descstyl.trim();

  // Extract stories: look for "N Story" pattern
  let stories: number | null = null;
  const storyMatch = text.match(/(\d+(?:\.\d+)?)\s*Stor(?:y|ies)/i);
  if (storyMatch) {
    const parsed = parseFloat(storyMatch[1]);
    if (!isNaN(parsed) && parsed > 0) {
      stories = Math.round(parsed);
    }
  }

  // Extract basement info
  let basement: string | null = null;
  if (/with\s+basement/i.test(text)) {
    basement = 'Yes';
  } else if (/no\s+basement/i.test(text)) {
    basement = 'No';
  }

  return { stories, basement };
}

/** Convert Web Mercator (EPSG:3857) X,Y to WGS84 lat/lon */
export function parseCoordinates(
  xStr: string | undefined,
  yStr: string | undefined,
): { latitude: string | null; longitude: string | null } {
  const x = parseFloat(xStr ?? '');
  const y = parseFloat(yStr ?? '');

  if (isNaN(x) || isNaN(y) || (x === 0 && y === 0)) {
    return { latitude: null, longitude: null };
  }

  // Web Mercator → WGS84
  const lon = (x / 20037508.34) * 180;
  const latRad = (y / 20037508.34) * Math.PI;
  const lat =
    (2 * Math.atan(Math.exp(latRad)) - Math.PI / 2) * (180 / Math.PI);

  return {
    latitude: lat.toFixed(7),
    longitude: lon.toFixed(7),
  };
}

/** Parse TRADATE (YYYYMMDD) → YYYY-MM-DD */
export function parseTraDate(tradate: string | undefined): string | null {
  if (!tradate) return null;
  const d = tradate.trim().replace(/\./g, '');
  if (d.length !== 8 || d === '00000000' || d.startsWith('0000')) return null;

  const year = d.slice(0, 4);
  const month = d.slice(4, 6);
  const day = d.slice(6, 8);

  // Basic validation
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const dd = parseInt(day, 10);
  if (y < 1800 || y > 2100 || m < 1 || m > 12 || dd < 1 || dd > 31)
    return null;

  return `${year}-${month}-${day}`;
}

// --- COPY stream support ---

/**
 * Build a street address from CSV row columns with fallback chain:
 * 1. ADDRESS column (if present)
 * 2. STRT* columns: STRTNUM + STRTDIR + STRTNAM + STRTTYP + STRTSFX
 * 3. PREMS* columns: PREMSNUM + PREMSDIR + PREMSNAM + PREMSTYP
 */
export function buildAddress(row: CsvRow): string | null {
  const address = row.ADDRESS?.trim();
  if (address) return address;

  const strtParts = [
    row.STRTNUM?.trim(),
    row.STRTDIR?.trim(),
    row.STRTNAM?.trim(),
    row.STRTTYP?.trim(),
    row.STRTSFX?.trim(),
  ].filter(Boolean);
  if (strtParts.length >= 2) return strtParts.join(' ');

  const premsParts = [
    row.PREMSNUM?.trim(),
    row.PREMSDIR?.trim(),
    row.PREMSNAM?.trim(),
    row.PREMSTYP?.trim(),
  ].filter(Boolean);
  if (premsParts.length >= 2) return premsParts.join(' ');

  return null;
}

/** Headers that are mapped to staging columns (excluded from raw_data JSONB) */
const MAPPED_HEADERS = new Set([
  'ADDRESS', 'CITY', 'ZIPCODE', 'JURSCODE',
  'STRTNUM', 'STRTDIR', 'STRTNAM', 'STRTTYP', 'STRTSFX',
  'PREMSNUM', 'PREMSDIR', 'PREMSNAM', 'PREMSTYP', 'PREMCITY', 'PREMZIP',
  'OWNNAME1', 'OWNNAME2', 'DESCLU', 'YEARBLT', 'SQFTSTRC',
  'LANDAREA', 'LUOM', 'BLDG_STORY', 'DESCSTYL', 'OOI',
  'LEGAL1', 'LEGAL2', 'LEGAL3', 'ZONING', 'ACCTID',
  'X', 'Y', 'TRADATE', 'CONSIDR1', 'GRNTNAM1', 'CONVEY1',
  'NFMLNDVL', 'NFMIMPVL', 'NFMTTLVL', 'DESCSUBD',
]);

/** Staging table columns in COPY order (must match COPY statement) */
const STAGING_COLUMNS = [
  'address', 'city', 'zip_code', 'county',
  'owner_name_1', 'owner_name_2', 'property_type',
  'year_built', 'square_footage',
  'land_area', 'land_unit', 'bldg_story', 'desc_style', 'ooi',
  'legal1', 'legal2', 'legal3', 'zoning', 'assessor_id',
  'latitude', 'longitude',
  'sale_date', 'sale_price', 'seller', 'document_type',
  'nfm_land_value', 'nfm_improvement_value', 'nfm_total_value',
  'subdivision', 'raw_data',
];

/** Escape a string value for COPY text format */
function escapeCopyValue(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Format a value for COPY: null → \N, otherwise escape */
function copyField(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '\\N';
  return escapeCopyValue(String(val));
}

/**
 * Transform stream: csv-parse row objects → tab-delimited COPY lines.
 * objectMode input, string output.
 */
export class CsvToCopyTransform extends Transform {
  private _totalRows = 0;
  private _errorCount = 0;

  constructor() {
    super({ objectMode: true, readableObjectMode: false });
  }

  getStats() {
    return { totalRows: this._totalRows, errorCount: this._errorCount };
  }

  _transform(row: CsvRow, _encoding: string, callback: TransformCallback): void {
    this._totalRows++;

    try {
      const address = buildAddress(row);
      if (!address) {
        // Skip rows with no address at all
        callback();
        return;
      }

      // Prefer CITY, fall back to PREMCITY
      const city = row.CITY?.trim() || row.PREMCITY?.trim() || null;
      const zipCode = row.ZIPCODE?.trim() || row.PREMZIP?.trim() || null;
      const county = JURISDICTION_CODES[row.JURSCODE?.trim()] ?? null;
      const ownerName1 = row.OWNNAME1?.trim() || null;
      const ownerName2 = row.OWNNAME2?.trim() || null;
      const propertyType = row.DESCLU?.trim() || null;

      // Year built: 0 → null
      const yearBuiltRaw = parseInt(row.YEARBLT, 10);
      const yearBuilt = !isNaN(yearBuiltRaw) && yearBuiltRaw > 0 ? yearBuiltRaw : null;

      // Square footage: 0 → null
      const sqftRaw = parseInt(row.SQFTSTRC, 10);
      const squareFootage = !isNaN(sqftRaw) && sqftRaw > 0 ? sqftRaw : null;

      // Land area / unit: pass raw to staging, compute lot_size in SQL
      const landAreaRaw = parseFloat(row.LANDAREA ?? '');
      const landArea = !isNaN(landAreaRaw) && landAreaRaw > 0 ? landAreaRaw : null;
      const landUnit = row.LUOM?.trim().toUpperCase() || null;

      // bldg_story: pass raw
      const bldgStoryRaw = parseFloat(row.BLDG_STORY ?? '');
      const bldgStory = !isNaN(bldgStoryRaw) && bldgStoryRaw > 0 ? bldgStoryRaw : null;

      const descStyle = row.DESCSTYL?.trim() || null;
      const ooi = row.OOI?.trim().toUpperCase() || null;

      const legal1 = row.LEGAL1?.trim() || null;
      const legal2 = row.LEGAL2?.trim() || null;
      const legal3 = row.LEGAL3?.trim() || null;
      const zoning = row.ZONING?.trim() || null;
      const assessorId = row.ACCTID?.trim() || null;

      // Coordinates: convert in JS (transcendental math)
      const { latitude, longitude } = parseCoordinates(row.X, row.Y);

      // Sale date: convert YYYYMMDD→YYYY-MM-DD in JS
      const saleDate = parseTraDate(row.TRADATE);
      const salePriceRaw = parseInt(row.CONSIDR1, 10);
      const salePrice = !isNaN(salePriceRaw) && salePriceRaw > 0 ? salePriceRaw : null;

      const seller = row.GRNTNAM1?.trim() || null;
      const documentType = row.CONVEY1?.trim() || null;

      // Tax values
      const nfmLand = parseFloat(row.NFMLNDVL ?? '');
      const nfmLandValue = !isNaN(nfmLand) ? nfmLand : null;
      const nfmImp = parseFloat(row.NFMIMPVL ?? '');
      const nfmImprovementValue = !isNaN(nfmImp) ? nfmImp : null;
      const nfmTotal = parseFloat(row.NFMTTLVL ?? '');
      const nfmTotalValue = !isNaN(nfmTotal) ? nfmTotal : null;

      const subdivision = row.DESCSUBD?.trim() || null;

      // raw_data: only unmapped fields
      const rawData: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        if (!MAPPED_HEADERS.has(key) && value && value.trim()) {
          rawData[key] = value.trim();
        }
      }
      const rawDataJson = Object.keys(rawData).length > 0 ? JSON.stringify(rawData) : null;

      // Build COPY line (tab-delimited)
      const fields = [
        copyField(address.toLowerCase()),
        copyField(city),
        copyField(zipCode),
        copyField(county),
        copyField(ownerName1),
        copyField(ownerName2),
        copyField(propertyType),
        copyField(yearBuilt),
        copyField(squareFootage),
        copyField(landArea),
        copyField(landUnit),
        copyField(bldgStory),
        copyField(descStyle),
        copyField(ooi),
        copyField(legal1),
        copyField(legal2),
        copyField(legal3),
        copyField(zoning),
        copyField(assessorId),
        copyField(latitude),
        copyField(longitude),
        copyField(saleDate),
        copyField(salePrice),
        copyField(seller),
        copyField(documentType),
        copyField(nfmLandValue),
        copyField(nfmImprovementValue),
        copyField(nfmTotalValue),
        copyField(subdivision),
        copyField(rawDataJson),
      ];

      callback(null, fields.join('\t') + '\n');
    } catch (err) {
      this._errorCount++;
      // Skip bad rows, don't abort the stream
      callback();
    }
  }
}

const LOG_INTERVAL = 100000;

/**
 * Import Maryland parcel CSV using COPY FROM STDIN → staging → SQL upserts.
 *
 * Phase 1: TRUNCATE staging_parcels
 * Phase 2: pipeline(csvReadStream, csvParser, CsvToCopyTransform, copyStream)
 * Phase 3: BEGIN → upsertFromStaging() → COMMIT (or ROLLBACK)
 */
export async function importCsv(
  connectionString: string,
  filePath: string,
  logger: (msg: string) => void = console.log,
  options: ImportOptions = {},
): Promise<ImportStats> {
  const dryRun = options.dryRun ?? false;
  const startTime = Date.now();
  const stats: ImportStats = {
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    elapsedMs: 0,
  };

  if (dryRun) {
    logger('DRY RUN mode — counting rows only, no DB writes');
    // In dry run, just parse the CSV and count
    const csvParser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
    const readStream = createReadStream(filePath, { encoding: 'utf-8' });
    readStream.pipe(csvParser);
    for await (const row of csvParser) {
      stats.totalRows++;
      const address = buildAddress(row as CsvRow);
      if (address) {
        stats.inserted++;
      } else {
        stats.skipped++;
      }
      if (stats.totalRows % LOG_INTERVAL === 0) {
        logger(`Dry run progress: ${stats.totalRows.toLocaleString()} rows`);
      }
    }
    stats.elapsedMs = Date.now() - startTime;
    return stats;
  }

  // Connect with pg.Client (required for COPY)
  const client = new Client({ connectionString });
  await client.connect();
  logger('Connected to database via pg.Client');

  try {
    // Phase 1: Truncate staging table
    logger('Phase 1: Truncating staging_parcels...');
    await client.query('TRUNCATE staging_parcels RESTART IDENTITY');

    // Phase 2: COPY CSV → staging_parcels
    logger('Phase 2: Streaming CSV into staging_parcels via COPY...');
    const copySQL = `COPY staging_parcels (${STAGING_COLUMNS.join(', ')}) FROM STDIN WITH (FORMAT text)`;
    const copyStream = client.query(copyFrom(copySQL));

    const csvParser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    const transform = new CsvToCopyTransform();

    // Progress logging via a passthrough that counts
    let lastLoggedRow = 0;
    transform.on('data', () => {
      // data events happen on output side, but we track via getStats
    });

    const progressInterval = setInterval(() => {
      const s = transform.getStats();
      if (s.totalRows > lastLoggedRow + LOG_INTERVAL) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(s.totalRows / ((Date.now() - startTime) / 1000));
        logger(
          `COPY progress: ${s.totalRows.toLocaleString()} rows (${rate}/sec) | ${elapsed}s`,
        );
        lastLoggedRow = s.totalRows;
      }
    }, 2000);

    const readStream = createReadStream(filePath, { encoding: 'utf-8' });

    await pipeline(readStream, csvParser, transform, copyStream);
    clearInterval(progressInterval);

    const transformStats = transform.getStats();
    stats.totalRows = transformStats.totalRows;
    stats.errors = transformStats.errorCount;

    const stagingCount = await client.query('SELECT COUNT(*) AS cnt FROM staging_parcels');
    const rowsInStaging = parseInt(stagingCount.rows[0].cnt, 10);
    logger(`COPY complete: ${stats.totalRows.toLocaleString()} CSV rows → ${rowsInStaging.toLocaleString()} staging rows`);

    // Phase 3: SQL upserts within a transaction
    logger('Phase 3: Upserting from staging → final tables...');
    await client.query('BEGIN');

    try {
      const upsertStats = await upsertFromStaging(client, logger);
      stats.inserted = upsertStats.inserted;
      stats.updated = upsertStats.updated;
      stats.skipped = upsertStats.skipped;

      await client.query('COMMIT');
      logger('Transaction committed');
    } catch (err) {
      await client.query('ROLLBACK');
      logger(`Transaction rolled back: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  } finally {
    await client.end();
  }

  stats.elapsedMs = Date.now() - startTime;
  return stats;
}

/**
 * SQL upserts: staging_parcels → properties, site_crawl_data, tax_assessments, sale_history
 */
async function upsertFromStaging(
  client: Client,
  logger: (msg: string) => void,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Step B: Upsert properties (DISTINCT ON for dedup, last row_num wins)
  logger('  Step B: Upserting properties...');
  const propertiesResult = await client.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (s.address)
        s.address,
        s.city,
        'MD' AS state,
        s.zip_code,
        s.county,
        CONCAT_WS(', ', NULLIF(s.owner_name_1, ''), NULLIF(s.owner_name_2, '')) AS owner_names,
        s.property_type,
        s.year_built,
        s.square_footage,
        LEAST(
          CASE
            WHEN s.land_unit = 'A' THEN ROUND(s.land_area * 43560)
            ELSE ROUND(s.land_area)
          END,
          2147483647
        ) AS lot_size,
        COALESCE(
          CASE WHEN s.bldg_story > 0 THEN ROUND(s.bldg_story) END,
          (regexp_match(s.desc_style, '(\d+(?:\.\d+)?)\s*Stor(?:y|ies)', 'i'))[1]::numeric
        )::integer AS stories,
        CASE
          WHEN s.desc_style ~* 'with\s+basement' THEN 'Yes'
          WHEN s.desc_style ~* 'no\s+basement' THEN 'No'
          ELSE NULL
        END AS basement,
        CASE
          WHEN s.ooi = 'H' THEN true
          WHEN s.ooi IN ('N', 'D') THEN false
          ELSE NULL
        END AS owner_occupied,
        CONCAT_WS(' ', NULLIF(s.legal1, ''), NULLIF(s.legal2, ''), NULLIF(s.legal3, '')) AS legal_description,
        s.zoning,
        s.assessor_id,
        s.latitude,
        s.longitude,
        s.sale_date AS last_sale_date,
        s.sale_price AS last_sale_price,
        s.subdivision,
        '${MD_PARCEL_CSV_SITE_ID}' AS data_source
      FROM staging_parcels s
      ORDER BY s.address, s.row_num DESC
    )
    INSERT INTO properties (
      address, city, state, zip_code, county,
      owner_names, property_type, year_built, square_footage, lot_size,
      stories, basement, owner_occupied, legal_description,
      zoning, assessor_id, latitude, longitude,
      last_sale_date, last_sale_price, subdivision, data_source,
      updated_at
    )
    SELECT
      d.address, d.city, d.state, d.zip_code, d.county,
      NULLIF(d.owner_names, ''), d.property_type, d.year_built, d.square_footage, d.lot_size::integer,
      d.stories, d.basement, d.owner_occupied, NULLIF(d.legal_description, ''),
      d.zoning, d.assessor_id, d.latitude, d.longitude,
      d.last_sale_date, d.last_sale_price, d.subdivision, d.data_source,
      now()
    FROM deduped d
    ON CONFLICT (address) DO UPDATE SET
      city = excluded.city,
      state = excluded.state,
      zip_code = excluded.zip_code,
      county = excluded.county,
      owner_names = excluded.owner_names,
      property_type = excluded.property_type,
      year_built = excluded.year_built,
      square_footage = excluded.square_footage,
      lot_size = excluded.lot_size,
      stories = excluded.stories,
      basement = excluded.basement,
      owner_occupied = excluded.owner_occupied,
      legal_description = excluded.legal_description,
      zoning = excluded.zoning,
      assessor_id = excluded.assessor_id,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      last_sale_date = excluded.last_sale_date,
      last_sale_price = excluded.last_sale_price,
      subdivision = excluded.subdivision,
      data_source = excluded.data_source,
      updated_at = excluded.updated_at
    WHERE properties.data_source IS NULL
       OR properties.data_source NOT IN ('md-sdat', 'merged')
    RETURNING id, address, (xmax = 0) AS is_new
  `);

  const newCount = propertiesResult.rows.filter((r: any) => r.is_new).length;
  inserted = newCount;
  updated = propertiesResult.rows.length - newCount;

  // Count unique addresses in staging to compute skipped
  const uniqueResult = await client.query('SELECT COUNT(DISTINCT address) AS cnt FROM staging_parcels');
  const uniqueAddresses = parseInt(uniqueResult.rows[0].cnt, 10);
  skipped = uniqueAddresses - propertiesResult.rows.length;

  logger(`    properties: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

  if (propertiesResult.rows.length === 0) {
    logger('  No properties upserted, skipping related tables');
    return { inserted, updated, skipped };
  }

  // Step C: Upsert site_crawl_data
logger('  Step C: Upserting site_crawl_data...');
  const crawlResult = await client.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (s.address)
        s.address, s.raw_data
      FROM staging_parcels s
      ORDER BY s.address, s.row_num DESC
    )
    INSERT INTO site_crawl_data (property_id, site_id, raw_data, updated_at)
    SELECT p.id, '${MD_PARCEL_CSV_SITE_ID}', d.raw_data, now()
    FROM deduped d
    JOIN properties p ON p.address = d.address
    WHERE p.data_source IS NULL
       OR p.data_source NOT IN ('md-sdat', 'merged')
    ON CONFLICT (property_id, site_id) DO UPDATE SET
      raw_data = excluded.raw_data,
      updated_at = excluded.updated_at
  `);
  logger(`    site_crawl_data: ${crawlResult.rowCount} rows`);

  // Step D: Upsert tax_assessments (where nfm_total_value > 0)
  logger('  Step D: Upserting tax_assessments...');
  const currentYear = new Date().getFullYear();
  const taxResult = await client.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (s.address)
        s.address, s.nfm_land_value, s.nfm_improvement_value, s.nfm_total_value
      FROM staging_parcels s
      WHERE s.nfm_total_value > 0
      ORDER BY s.address, s.row_num DESC
    )
    INSERT INTO tax_assessments (property_id, year, land_value, improvement_value, total_value)
    SELECT p.id, ${currentYear}, d.nfm_land_value, d.nfm_improvement_value, d.nfm_total_value
    FROM deduped d
    JOIN properties p ON p.address = d.address
    WHERE p.data_source IS NULL
       OR p.data_source NOT IN ('md-sdat', 'merged')
    ON CONFLICT (property_id, year) DO UPDATE SET
      land_value = excluded.land_value,
      improvement_value = excluded.improvement_value,
      total_value = excluded.total_value
  `);
  logger(`    tax_assessments: ${taxResult.rowCount} rows`);

  // Step E: Insert sale_history (only new records)
  logger('  Step E: Inserting sale_history...');
  const saleResult = await client.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (s.address)
        s.address, s.sale_date, s.sale_price, s.seller, s.document_type
      FROM staging_parcels s
      WHERE s.sale_date IS NOT NULL AND s.sale_price IS NOT NULL AND s.sale_price > 0
      ORDER BY s.address, s.row_num DESC
    )
    INSERT INTO sale_history (property_id, sale_date, sale_price, seller, document_type)
    SELECT p.id, d.sale_date, d.sale_price, d.seller, d.document_type
    FROM deduped d
    JOIN properties p ON p.address = d.address
    WHERE (p.data_source IS NULL OR p.data_source NOT IN ('md-sdat', 'merged'))
      AND NOT EXISTS (
        SELECT 1 FROM sale_history sh
        WHERE sh.property_id = p.id AND sh.sale_date = d.sale_date
      )
  `);
  logger(`    sale_history: ${saleResult.rowCount} rows`);

  return { inserted, updated, skipped };
}
