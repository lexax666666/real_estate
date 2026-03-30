import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '@api/db/schema';
import { JURISDICTION_CODES, MD_PARCEL_CSV_SITE_ID } from './sdat.constants';

/** Shape of a single CSV row after header mapping */
export interface CsvRow {
  [key: string]: string;
}

/** Parsed property record ready for DB insertion */
export interface ParsedCsvProperty {
  address: string;
  city: string | null;
  state: string;
  zipCode: string | null;
  county: string | null;
  ownerNames: string | null;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  lotSize: number | null;
  stories: number | null;
  basement: string | null;
  ownerOccupied: boolean | null;
  legalDescription: string | null;
  zoning: string | null;
  assessorId: string | null;
  latitude: string | null;
  longitude: string | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  subdivision: string | null;
  // Related data
  taxAssessment: { land: number; improvements: number; total: number } | null;
  saleHistory: {
    date: string;
    price: number;
    seller: string | null;
    documentType: string | null;
  } | null;
  rawData: Record<string, string>;
}

export interface ImportStats {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  elapsedMs: number;
}

/**
 * Parse a single CSV row into a normalized property record.
 * Exported for unit testing.
 */
export function parseCsvRow(row: CsvRow): ParsedCsvProperty | null {
  const address = row.ADDRESS?.trim();
  if (!address) return null;

  const city = row.CITY?.trim() || null;
  const zipCode = row.ZIPCODE?.trim() || null;
  const county = JURISDICTION_CODES[row.JURSCODE?.trim()] ?? null;

  // Owner names: join OWNNAME1 + OWNNAME2
  const owner1 = row.OWNNAME1?.trim() || '';
  const owner2 = row.OWNNAME2?.trim() || '';
  const ownerNames =
    [owner1, owner2].filter(Boolean).join(', ') || null;

  // Property type from DESCLU
  const propertyType = row.DESCLU?.trim() || null;

  // Year built: 0 → null
  const yearBuiltRaw = parseInt(row.YEARBLT, 10);
  const yearBuilt =
    !isNaN(yearBuiltRaw) && yearBuiltRaw > 0 ? yearBuiltRaw : null;

  // Square footage: 0 → null
  const sqftRaw = parseInt(row.SQFTSTRC, 10);
  const squareFootage = !isNaN(sqftRaw) && sqftRaw > 0 ? sqftRaw : null;

  // Lot size: convert acres to sqft if LUOM=A
  const lotSize = parseLotSize(row.LANDAREA, row.LUOM);

  // Stories and basement from DESCSTYL
  const { stories, basement } = parseDescStyle(row.DESCSTYL);

  // Override stories with BLDG_STORY if available
  const bldgStory = parseFloat(row.BLDG_STORY);
  const finalStories =
    !isNaN(bldgStory) && bldgStory > 0
      ? Math.round(bldgStory)
      : stories;

  // Owner occupied: H=true, N/D=false
  const ooi = row.OOI?.trim().toUpperCase();
  const ownerOccupied = ooi === 'H' ? true : ooi === 'N' || ooi === 'D' ? false : null;

  // Legal description
  const legal1 = row.LEGAL1?.trim() || '';
  const legal2 = row.LEGAL2?.trim() || '';
  const legal3 = row.LEGAL3?.trim() || '';
  const legalDescription =
    [legal1, legal2, legal3].filter(Boolean).join(' ') || null;

  const zoning = row.ZONING?.trim() || null;
  const assessorId = row.ACCTID?.trim() || null;

  // Coordinates: X,Y are Web Mercator (EPSG:3857) → WGS84
  const { latitude, longitude } = parseCoordinates(row.X, row.Y);

  // Sale date: YYYYMMDD → YYYY-MM-DD
  const lastSaleDate = parseTraDate(row.TRADATE);
  const considr1 = parseInt(row.CONSIDR1, 10);
  const lastSalePrice =
    !isNaN(considr1) && considr1 > 0 ? considr1 : null;

  // Subdivision
  const subdivision = row.DESCSUBD?.trim() || null;

  // Tax assessment (current cycle)
  const nfmLand = parseFloat(row.NFMLNDVL);
  const nfmImp = parseFloat(row.NFMIMPVL);
  const nfmTotal = parseFloat(row.NFMTTLVL);
  const taxAssessment =
    !isNaN(nfmTotal) && nfmTotal > 0
      ? {
          land: isNaN(nfmLand) ? 0 : nfmLand,
          improvements: isNaN(nfmImp) ? 0 : nfmImp,
          total: nfmTotal,
        }
      : null;

  // Sale history
  const saleHistory =
    lastSaleDate && lastSalePrice
      ? {
          date: lastSaleDate,
          price: lastSalePrice,
          seller: row.GRNTNAM1?.trim() || null,
          documentType: row.CONVEY1?.trim() || null,
        }
      : null;

  // Raw data: store selected CSV fields as JSONB
  const rawData: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && value.trim()) {
      rawData[key] = value.trim();
    }
  }

  return {
    address,
    city,
    state: 'MD',
    zipCode,
    county,
    ownerNames,
    propertyType,
    yearBuilt,
    squareFootage,
    lotSize,
    stories: finalStories,
    basement,
    ownerOccupied,
    legalDescription,
    zoning,
    assessorId,
    latitude,
    longitude,
    lastSaleDate,
    lastSalePrice,
    subdivision,
    taxAssessment,
    saleHistory,
    rawData,
  };
}

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

const BATCH_SIZE = 1000;
const LOG_INTERVAL = 10000;

/**
 * Import Maryland parcel CSV into the database.
 * Streams the file and batch-inserts for performance.
 */
export async function importCsv(
  db: NeonHttpDatabase<typeof schema>,
  filePath: string,
  logger: (msg: string) => void = console.log,
): Promise<ImportStats> {
  const startTime = Date.now();
  const stats: ImportStats = {
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    elapsedMs: 0,
  };

  const batch: ParsedCsvProperty[] = [];

  const parser = createReadStream(filePath, { encoding: 'utf-8' }).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      // Handle BOM
      bom: true,
    }),
  );

  for await (const row of parser) {
    stats.totalRows++;

    try {
      const parsed = parseCsvRow(row as CsvRow);
      if (!parsed) {
        stats.skipped++;
        continue;
      }

      batch.push(parsed);

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(db, batch, stats);
        batch.length = 0;
      }

      if (stats.totalRows % LOG_INTERVAL === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(stats.totalRows / ((Date.now() - startTime) / 1000));
        logger(
          `Progress: ${stats.totalRows.toLocaleString()} rows (${rate}/sec) | ` +
            `inserted=${stats.inserted} updated=${stats.updated} ` +
            `skipped=${stats.skipped} errors=${stats.errors} | ${elapsed}s`,
        );
      }
    } catch (err) {
      stats.errors++;
      if (stats.errors <= 10) {
        logger(
          `Error at row ${stats.totalRows}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    await insertBatch(db, batch, stats);
  }

  stats.elapsedMs = Date.now() - startTime;
  return stats;
}

/**
 * Insert a batch of parsed properties into the database.
 * Uses ON CONFLICT DO UPDATE for idempotency.
 */
async function insertBatch(
  db: NeonHttpDatabase<typeof schema>,
  batch: ParsedCsvProperty[],
  stats: ImportStats,
): Promise<void> {
  for (const prop of batch) {
    try {
      const normalizedAddress = prop.address.toLowerCase().trim();

      // Check if already enriched by SDAT crawler — skip if so
      const existing = await db.query.properties.findFirst({
        where: eq(schema.properties.address, normalizedAddress),
        columns: { id: true, dataSource: true },
      });

      if (
        existing &&
        (existing.dataSource === 'md-sdat' || existing.dataSource === 'merged')
      ) {
        stats.skipped++;
        continue;
      }

      let propertyId: number;

      if (existing) {
        // Update existing
        await db
          .update(schema.properties)
          .set({
            city: prop.city,
            state: prop.state,
            zipCode: prop.zipCode,
            county: prop.county,
            ownerNames: prop.ownerNames,
            propertyType: prop.propertyType,
            yearBuilt: prop.yearBuilt,
            squareFootage: prop.squareFootage,
            lotSize: prop.lotSize,
            stories: prop.stories,
            basement: prop.basement,
            ownerOccupied: prop.ownerOccupied,
            legalDescription: prop.legalDescription,
            zoning: prop.zoning,
            assessorId: prop.assessorId,
            latitude: prop.latitude,
            longitude: prop.longitude,
            lastSaleDate: prop.lastSaleDate,
            lastSalePrice: prop.lastSalePrice,
            subdivision: prop.subdivision,
            dataSource: MD_PARCEL_CSV_SITE_ID,
            updatedAt: new Date(),
          })
          .where(eq(schema.properties.id, existing.id));

        propertyId = existing.id;
        stats.updated++;
      } else {
        // Insert new
        const [inserted] = await db
          .insert(schema.properties)
          .values({
            address: normalizedAddress,
            city: prop.city,
            state: prop.state,
            zipCode: prop.zipCode,
            county: prop.county,
            ownerNames: prop.ownerNames,
            propertyType: prop.propertyType,
            yearBuilt: prop.yearBuilt,
            squareFootage: prop.squareFootage,
            lotSize: prop.lotSize,
            stories: prop.stories,
            basement: prop.basement,
            ownerOccupied: prop.ownerOccupied,
            legalDescription: prop.legalDescription,
            zoning: prop.zoning,
            assessorId: prop.assessorId,
            latitude: prop.latitude,
            longitude: prop.longitude,
            lastSaleDate: prop.lastSaleDate,
            lastSalePrice: prop.lastSalePrice,
            subdivision: prop.subdivision,
            dataSource: MD_PARCEL_CSV_SITE_ID,
          })
          .returning({ id: schema.properties.id });

        propertyId = inserted.id;
        stats.inserted++;
      }

      // Upsert site_crawl_data with raw CSV fields
      await db
        .insert(schema.siteCrawlData)
        .values({
          propertyId,
          siteId: MD_PARCEL_CSV_SITE_ID,
          rawData: prop.rawData,
        })
        .onConflictDoUpdate({
          target: [
            schema.siteCrawlData.propertyId,
            schema.siteCrawlData.siteId,
          ],
          set: {
            rawData: prop.rawData,
            updatedAt: new Date(),
          },
        });

      // Insert tax assessment (use current year)
      if (prop.taxAssessment) {
        const currentYear = new Date().getFullYear();
        await db
          .insert(schema.taxAssessments)
          .values({
            propertyId,
            year: currentYear,
            landValue: prop.taxAssessment.land.toString(),
            improvementValue: prop.taxAssessment.improvements.toString(),
            totalValue: prop.taxAssessment.total.toString(),
          })
          .onConflictDoUpdate({
            target: [
              schema.taxAssessments.propertyId,
              schema.taxAssessments.year,
            ],
            set: {
              landValue: prop.taxAssessment.land.toString(),
              improvementValue: prop.taxAssessment.improvements.toString(),
              totalValue: prop.taxAssessment.total.toString(),
            },
          });
      }

      // Insert sale history
      if (prop.saleHistory) {
        const existingSale = await db.query.saleHistory.findFirst({
          where: and(
            eq(schema.saleHistory.propertyId, propertyId),
            eq(schema.saleHistory.saleDate, prop.saleHistory.date),
          ),
        });

        if (!existingSale) {
          await db.insert(schema.saleHistory).values({
            propertyId,
            saleDate: prop.saleHistory.date,
            salePrice: prop.saleHistory.price,
            seller: prop.saleHistory.seller,
            documentType: prop.saleHistory.documentType,
          });
        }
      }
    } catch (err) {
      stats.errors++;
      if (stats.errors <= 10) {
        console.error(
          `Insert error for "${prop.address}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
