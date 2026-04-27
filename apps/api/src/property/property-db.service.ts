import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, lt, count, avg, min, max, and } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  properties,
  taxAssessments,
  propertyTaxes,
  saleHistory,
} from '../db/schema';
import * as schema from '../db/schema';
import { DRIZZLE } from '../db/db.module';
import { AddressParserService } from './address-parser.service';

export interface PropertyCacheEntry {
  id: number;
  address: string;
  property_data: any;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
  access_count: number;
}

export interface SearchResult {
  id: number;
  address: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  topMatch: any | null;
  autoSelected: boolean;
}

const HIGH_CONFIDENCE_THRESHOLD = 5.0;

@Injectable()
export class PropertyDbService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NeonHttpDatabase<typeof schema>,
    private readonly addressParser: AddressParserService,
  ) {}

  async getPropertyFromDB(address: string): Promise<any | null> {
    try {
      const parsed = this.addressParser.parseAddress(address);
      const streetAddress = parsed.streetAddress.trim().toLowerCase();

      // Build query conditions: always match on street address
      const conditions = [eq(properties.address, streetAddress)];

      // If parsed city/state/zip are available, add them to narrow the search
      if (parsed.city) {
        conditions.push(eq(properties.city, parsed.city));
      }
      if (parsed.state) {
        conditions.push(eq(properties.state, parsed.state));
      }
      if (parsed.zip) {
        conditions.push(eq(properties.zipCode, parsed.zip));
      }

      // Try with all conditions first (most specific)
      let result = await this.db.query.properties.findFirst({
        where: and(...conditions),
        with: {
          taxAssessments: true,
          propertyTaxes: true,
          saleHistory: true,
        },
      });

      // If no result and we had extra conditions, fall back to street-only match
      if (!result && conditions.length > 1) {
        result = await this.db.query.properties.findFirst({
          where: eq(properties.address, streetAddress),
          with: {
            taxAssessments: true,
            propertyTaxes: true,
            saleHistory: true,
          },
        });
      }

      // Final fallback: try raw input (lowercased) in case the parser dropped words
      // e.g., parse-address drops "sun" from "9354 westering sun"
      const rawAddress = address.trim().toLowerCase();
      if (!result && rawAddress !== streetAddress) {
        result = await this.db.query.properties.findFirst({
          where: eq(properties.address, rawAddress),
          with: {
            taxAssessments: true,
            propertyTaxes: true,
            saleHistory: true,
          },
        });
      }

      if (!result) {
        return null;
      }

      // Update access tracking
      await this.db
        .update(properties)
        .set({
          lastAccessedAt: new Date(),
          accessCount: sql`${properties.accessCount} + 1`,
        })
        .where(eq(properties.id, result.id));

      // Reconstruct the API response shape
      const data = this.reconstructApiResponse(result);

      return {
        data,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      console.error('Error fetching property from database:', error);
      return null;
    }
  }

  async savePropertyToDB(
    address: string,
    propertyData: any,
    rawResponse?: any,
  ): Promise<boolean> {
    try {
      // Parse to extract street-only portion for the address column
      const parsed = this.addressParser.parseAddress(address);
      const normalizedAddress = parsed.streetAddress.trim().toLowerCase();

      // Upsert the main property record
      const [upserted] = await this.db
        .insert(properties)
        .values({
          rentcastId: rawResponse?.id || null,
          address: normalizedAddress,
          formattedAddress: propertyData.address || null,
          city: propertyData.city || null,
          state: propertyData.state || null,
          zipCode: propertyData.zipCode || null,
          county: propertyData.county || null,
          neighborhood: propertyData.neighborhood || null,
          subdivision: propertyData.subdivision || null,
          latitude: propertyData.latitude?.toString() || null,
          longitude: propertyData.longitude?.toString() || null,
          propertyType: propertyData.propertyType || null,
          yearBuilt: propertyData.yearBuilt || null,
          squareFootage: propertyData.squareFootage || null,
          lotSize: propertyData.lotSize || null,
          bedrooms: propertyData.bedrooms || null,
          bathrooms: propertyData.bathrooms?.toString() || null,
          stories: propertyData.stories || null,
          basement: propertyData.basement || null,
          garageSpaces: propertyData.garage || null,
          lastSaleDate: propertyData.lastSaleDate || null,
          lastSalePrice: propertyData.lastSalePrice || null,
          ownerNames: propertyData.ownerName || null,
          ownerOccupied: propertyData.ownerOccupied ?? null,
          hoaFee: propertyData.hoaFee?.toString() || null,
          zoning: propertyData.zoning || null,
          assessorId: propertyData.assessorID || null,
          legalDescription: propertyData.legalDescription || null,
          features: propertyData.features || null,
          rawResponse: rawResponse || null,
          dataSource: 'rentcast',
          accessCount: 1,
        })
        .onConflictDoUpdate({
          target: properties.address,
          set: {
            rentcastId: rawResponse?.id || null,
            formattedAddress: propertyData.address || null,
            city: propertyData.city || null,
            state: propertyData.state || null,
            zipCode: propertyData.zipCode || null,
            county: propertyData.county || null,
            neighborhood: propertyData.neighborhood || null,
            subdivision: propertyData.subdivision || null,
            latitude: propertyData.latitude?.toString() || null,
            longitude: propertyData.longitude?.toString() || null,
            propertyType: propertyData.propertyType || null,
            yearBuilt: propertyData.yearBuilt || null,
            squareFootage: propertyData.squareFootage || null,
            lotSize: propertyData.lotSize || null,
            bedrooms: propertyData.bedrooms || null,
            bathrooms: propertyData.bathrooms?.toString() || null,
            stories: propertyData.stories || null,
            basement: propertyData.basement || null,
            garageSpaces: propertyData.garage || null,
            lastSaleDate: propertyData.lastSaleDate || null,
            lastSalePrice: propertyData.lastSalePrice || null,
            ownerNames: propertyData.ownerName || null,
            ownerOccupied: propertyData.ownerOccupied ?? null,
            hoaFee: propertyData.hoaFee?.toString() || null,
            zoning: propertyData.zoning || null,
            assessorId: propertyData.assessorID || null,
            legalDescription: propertyData.legalDescription || null,
            features: propertyData.features || null,
            rawResponse: rawResponse || null,
            dataSource: 'rentcast',
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: sql`${properties.accessCount} + 1`,
          },
        })
        .returning();

      const propertyId = upserted.id;

      // Delete existing related records before reinserting
      await this.db
        .delete(taxAssessments)
        .where(eq(taxAssessments.propertyId, propertyId));
      await this.db
        .delete(propertyTaxes)
        .where(eq(propertyTaxes.propertyId, propertyId));
      await this.db
        .delete(saleHistory)
        .where(eq(saleHistory.propertyId, propertyId));

      // Insert tax assessments
      if (propertyData.taxAssessments) {
        const assessmentRows = Object.entries(propertyData.taxAssessments).map(
          ([year, data]: [string, any]) => ({
            propertyId,
            year: parseInt(year),
            landValue: data.land?.toString() || null,
            improvementValue: data.improvements?.toString() || null,
            totalValue: data.value?.toString() || null,
          }),
        );
        if (assessmentRows.length > 0) {
          await this.db.insert(taxAssessments).values(assessmentRows);
        }
      }

      // Insert property taxes
      if (propertyData.propertyTaxes) {
        const taxRows = Object.entries(propertyData.propertyTaxes).map(
          ([year, data]: [string, any]) => ({
            propertyId,
            year: parseInt(year),
            total: data.total?.toString() || null,
          }),
        );
        if (taxRows.length > 0) {
          await this.db.insert(propertyTaxes).values(taxRows);
        }
      }

      // Insert sale history
      if (propertyData.history && Array.isArray(propertyData.history)) {
        const historyRows = propertyData.history.map((h: any) => ({
          propertyId,
          saleDate: h.date || null,
          salePrice: h.price || null,
          buyer: h.buyer || null,
          seller: h.seller || null,
          documentType: h.documentType || null,
          recordingDate: h.recordingDate || null,
        }));
        if (historyRows.length > 0) {
          await this.db.insert(saleHistory).values(historyRows);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving property to database:', error);
      return false;
    }
  }

  isCacheFresh(updatedAt: Date, maxAgeHours: number = 24): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - new Date(updatedAt).getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    return cacheAge < maxAgeMs;
  }

  async cleanupStaleCache(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);

      const deleted = await this.db
        .delete(properties)
        .where(lt(properties.updatedAt, cutoff))
        .returning({ id: properties.id });

      return deleted.length;
    } catch (error) {
      console.error('Error cleaning up stale cache:', error);
      return 0;
    }
  }

  async getCacheStats(): Promise<{
    totalProperties: number;
    avgAccessCount: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } | null> {
    try {
      const result = await this.db
        .select({
          totalProperties: count(),
          avgAccessCount: avg(properties.accessCount),
          oldestEntry: min(properties.createdAt),
          newestEntry: max(properties.createdAt),
        })
        .from(properties);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        totalProperties: row.totalProperties,
        avgAccessCount: parseFloat(row.avgAccessCount || '0'),
        oldestEntry: row.oldestEntry,
        newestEntry: row.newestEntry,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  buildSearchQuery(query: string, isAutocomplete = false): string {
    const tokens = this.addressParser.tokenizeSearchInput(query);
    if (tokens.length === 0) return '';

    const mustClauses: string[] = [];
    const shouldClauses: string[] = [];

    tokens.forEach((token, index) => {
      const type = this.addressParser.classifyToken(token);
      const isLastToken = index === tokens.length - 1;

      switch (type) {
        case 'noise':
          // Skip noise words
          break;
        case 'house_number':
          // House numbers must match in address
          mustClauses.push(
            `paradedb.boost(3.0, paradedb.term('address', ${this.escapeSQL(token)}))`,
          );
          break;
        case 'zip':
          // ZIP is optional but boosts relevance
          shouldClauses.push(
            `paradedb.boost(2.0, paradedb.term('zip_code', ${this.escapeSQL(token)}))`,
          );
          break;
        case 'state':
          // State is optional but boosts relevance
          shouldClauses.push(
            `paradedb.term('state', ${this.escapeSQL(token)})`,
          );
          break;
        case 'word': {
          if (isLastToken && isAutocomplete) {
            // Last token in autocomplete mode → prefix match (must)
            mustClauses.push(
              `paradedb.phrase_prefix('address', ARRAY[${this.escapeSQL(token)}])`,
            );
          } else {
            // Word must match in either address or city (with abbreviation variants)
            const variants = this.addressParser.expandAbbreviations(token);
            const subClauses = variants.flatMap((v) => [
              `paradedb.fuzzy_term('address', ${this.escapeSQL(v)}, distance => 1)`,
              `paradedb.fuzzy_term('city', ${this.escapeSQL(v)}, distance => 1)`,
            ]);
            mustClauses.push(
              `paradedb.boolean(should => ARRAY[${subClauses.join(', ')}])`,
            );
          }
          break;
        }
      }
    });

    if (mustClauses.length === 0 && shouldClauses.length === 0) return '';

    // If only should clauses (e.g. just a ZIP or state), use should
    if (mustClauses.length === 0) {
      return `paradedb.boolean(should => ARRAY[${shouldClauses.join(', ')}])`;
    }

    // If only must clauses, use must
    if (shouldClauses.length === 0) {
      return `paradedb.boolean(must => ARRAY[${mustClauses.join(', ')}])`;
    }

    // Both: core tokens must match, extras boost relevance
    return `paradedb.boolean(must => ARRAY[${mustClauses.join(', ')}], should => ARRAY[${shouldClauses.join(', ')}])`;
  }

  private escapeSQL(value: string): string {
    // Escape single quotes for SQL string literals
    return `'${value.replace(/'/g, "''")}'`;
  }

  async searchProperties(
    query: string,
    limit = 10,
  ): Promise<SearchResponse> {
    try {
      const booleanQuery = this.buildSearchQuery(query);
      if (!booleanQuery) {
        return { results: [], topMatch: null, autoSelected: false };
      }

      const searchSQL = sql.raw(`
        SELECT id, address, formatted_address, city, state, zip_code,
               paradedb.score(id) AS score
        FROM properties
        WHERE id @@@ ${booleanQuery}
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      const result = await this.db.execute(searchSQL);
      const rows = result.rows as any[];

      const results: SearchResult[] = rows.map((row) => ({
        id: row.id,
        address: row.address,
        formattedAddress: row.formatted_address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        score: parseFloat(row.score),
      }));

      // Hybrid behavior: auto-select if top result has high confidence
      let topMatch: any | null = null;
      let autoSelected = false;

      if (results.length > 0 && results[0].score >= HIGH_CONFIDENCE_THRESHOLD) {
        const fullResult = await this.getPropertyFromDB(results[0].address);
        if (fullResult) {
          topMatch = fullResult.data;
          autoSelected = true;
        }
      }

      return { results, topMatch, autoSelected };
    } catch (error) {
      console.error('Error searching properties:', error);
      return { results: [], topMatch: null, autoSelected: false };
    }
  }

  async autocompleteProperties(
    query: string,
    limit = 5,
  ): Promise<SearchResult[]> {
    try {
      const booleanQuery = this.buildSearchQuery(query, true);
      if (!booleanQuery) {
        return [];
      }

      const searchSQL = sql.raw(`
        SELECT id, address, formatted_address, city, state, zip_code,
               paradedb.score(id) AS score
        FROM properties
        WHERE id @@@ ${booleanQuery}
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      const result = await this.db.execute(searchSQL);
      const rows = result.rows as any[];

      return rows.map((row) => ({
        id: row.id,
        address: row.address,
        formattedAddress: row.formatted_address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        score: parseFloat(row.score),
      }));
    } catch (error) {
      console.error('Error autocompleting properties:', error);
      return [];
    }
  }

  private reconstructApiResponse(prop: any): any {
    // Reconstruct taxAssessments as year-keyed object
    const taxAssessmentsObj: Record<string, any> = {};
    if (prop.taxAssessments) {
      for (const a of prop.taxAssessments) {
        taxAssessmentsObj[a.year] = {
          land: parseFloat(a.landValue) || 0,
          improvements: parseFloat(a.improvementValue) || 0,
          value: parseFloat(a.totalValue) || 0,
        };
      }
    }

    // Reconstruct propertyTaxes as year-keyed object
    const propertyTaxesObj: Record<string, any> = {};
    if (prop.propertyTaxes) {
      for (const t of prop.propertyTaxes) {
        propertyTaxesObj[t.year] = {
          total: parseFloat(t.total) || 0,
        };
      }
    }

    // Reconstruct history array
    const historyArr = (prop.saleHistory || []).map((h: any) => ({
      date: h.saleDate,
      price: h.salePrice,
      buyer: h.buyer,
      seller: h.seller,
      documentType: h.documentType,
      recordingDate: h.recordingDate,
    }));

    // Get latest assessment
    const assessmentYears = Object.keys(taxAssessmentsObj).map(Number);
    const latestAssessmentYear =
      assessmentYears.length > 0 ? Math.max(...assessmentYears) : null;
    const latestAssessment = latestAssessmentYear
      ? taxAssessmentsObj[latestAssessmentYear]
      : null;

    // Get latest tax
    const taxYears = Object.keys(propertyTaxesObj).map(Number);
    const latestTaxYear = taxYears.length > 0 ? Math.max(...taxYears) : null;
    const latestTax = latestTaxYear ? propertyTaxesObj[latestTaxYear] : null;

    return {
      address: prop.formattedAddress || prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zipCode,
      ownerName: prop.ownerNames || 'N/A',
      propertyType: prop.propertyType || 'Residential',
      yearBuilt: prop.yearBuilt,
      squareFootage: prop.squareFootage,
      lotSize: prop.lotSize,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms ? parseFloat(prop.bathrooms) : null,
      stories: prop.stories,
      basement: prop.basement,
      garage: prop.garageSpaces,
      lastSaleDate: prop.lastSaleDate,
      lastSalePrice: prop.lastSalePrice,
      assessedValue: {
        land: latestAssessment?.land || 0,
        building: latestAssessment?.improvements || 0,
        total: latestAssessment?.value || 0,
      },
      assessedDate: latestAssessmentYear,
      neighborhood: prop.neighborhood,
      subdivision: prop.subdivision,
      county: prop.county,
      latitude: prop.latitude ? parseFloat(prop.latitude) : null,
      longitude: prop.longitude ? parseFloat(prop.longitude) : null,
      taxAmount: latestTax?.total,
      hoaFee: prop.hoaFee ? parseFloat(prop.hoaFee) : null,
      features: prop.features,
      ownerOccupied: prop.ownerOccupied,
      zoning: prop.zoning,
      assessorID: prop.assessorId,
      legalDescription: prop.legalDescription,
      map: prop.map,
      grid: prop.grid,
      parcel: prop.parcel,
      section: prop.section,
      block: prop.block,
      lot: prop.lot,
      ownerAddress1: prop.ownerAddress1,
      ownerAddress2: prop.ownerAddress2,
      ownerCity: prop.ownerCity,
      ownerState: prop.ownerState,
      ownerZip: prop.ownerZip,
      ownerZip2: prop.ownerZip2,
      exterior: prop.constructionMaterial,
      quality: prop.constructionGrade,
      deedLiber: prop.deedLiber,
      deedFolio: prop.deedFolio,
      grantorLiber: prop.grantorLiber,
      grantorFolio: prop.grantorFolio,
      mortgageAmount: prop.mortgageAmount,
      homesteadStatus: prop.homesteadStatus,
      homesteadDate: prop.homesteadDate,
      taxAssessments: taxAssessmentsObj,
      propertyTaxes: propertyTaxesObj,
      history: historyArr,
    };
  }
}
