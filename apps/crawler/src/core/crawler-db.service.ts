import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, isNull, or, lt, sql } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@api/db/schema';
import { ParsedPropertyData } from './interfaces/crawl-result.interface';

export const DRIZZLE = Symbol('DRIZZLE');

@Injectable()
export class CrawlerDbService {
  private readonly logger = new Logger(CrawlerDbService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NeonHttpDatabase<typeof schema>,
  ) {}

  /**
   * Save crawled property data to the database.
   * Upserts into properties, site_crawl_data, tax_assessments, sale_history.
   */
  async savePropertyFromCrawl(
    siteId: string,
    data: ParsedPropertyData,
  ): Promise<number> {
    const normalizedAddress = data.address.toLowerCase().trim();

    // Check if property already exists
    const existing = await this.db.query.properties.findFirst({
      where: eq(schema.properties.address, normalizedAddress),
    });

    let propertyId: number;

    if (existing) {
      // Update existing property, merge data source
      const newDataSource =
        existing.dataSource && existing.dataSource !== siteId
          ? 'merged'
          : siteId;

      await this.db
        .update(schema.properties)
        .set({
          city: data.city ?? existing.city,
          state: data.state ?? existing.state,
          zipCode: data.zipCode ?? existing.zipCode,
          county: data.county ?? existing.county,
          ownerNames: data.ownerNames ?? existing.ownerNames,
          propertyType: data.propertyType ?? existing.propertyType,
          yearBuilt: data.yearBuilt ?? existing.yearBuilt,
          squareFootage: data.squareFootage ?? existing.squareFootage,
          lotSize: data.lotSize ?? existing.lotSize,
          bedrooms: data.bedrooms ?? existing.bedrooms,
          bathrooms: data.bathrooms?.toString() ?? existing.bathrooms,
          stories: data.stories ?? existing.stories,
          basement: data.basement ?? existing.basement,
          garageSpaces: data.garageSpaces ?? existing.garageSpaces,
          lastSaleDate: data.lastSaleDate ?? existing.lastSaleDate,
          lastSalePrice: data.lastSalePrice ?? existing.lastSalePrice,
          legalDescription: data.legalDescription ?? existing.legalDescription,
          neighborhood: data.neighborhood ?? existing.neighborhood,
          subdivision: data.subdivision ?? existing.subdivision,
          dataSource: newDataSource,
          updatedAt: new Date(),
        })
        .where(eq(schema.properties.id, existing.id));

      propertyId = existing.id;
    } else {
      // Insert new property
      const [inserted] = await this.db
        .insert(schema.properties)
        .values({
          address: normalizedAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          county: data.county,
          ownerNames: data.ownerNames,
          propertyType: data.propertyType,
          yearBuilt: data.yearBuilt,
          squareFootage: data.squareFootage,
          lotSize: data.lotSize,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms?.toString(),
          stories: data.stories,
          basement: data.basement,
          garageSpaces: data.garageSpaces,
          lastSaleDate: data.lastSaleDate,
          lastSalePrice: data.lastSalePrice,
          legalDescription: data.legalDescription,
          neighborhood: data.neighborhood,
          subdivision: data.subdivision,
          dataSource: siteId,
        })
        .returning({ id: schema.properties.id });

      propertyId = inserted.id;
    }

    // Upsert site_crawl_data
    const existingCrawlData = await this.db.query.siteCrawlData.findFirst({
      where: and(
        eq(schema.siteCrawlData.propertyId, propertyId),
        eq(schema.siteCrawlData.siteId, siteId),
      ),
    });

    if (existingCrawlData) {
      await this.db
        .update(schema.siteCrawlData)
        .set({
          rawHtml: data.rawHtml,
          rawData: data.siteSpecificData ?? null,
          crawledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.siteCrawlData.id, existingCrawlData.id));
    } else {
      await this.db.insert(schema.siteCrawlData).values({
        propertyId,
        siteId,
        rawHtml: data.rawHtml,
        rawData: data.siteSpecificData ?? null,
      });
    }

    // Insert tax assessments
    if (data.taxAssessments) {
      for (const [yearStr, assessment] of Object.entries(
        data.taxAssessments,
      )) {
        const year = parseInt(yearStr, 10);
        if (isNaN(year)) continue;

        await this.db
          .insert(schema.taxAssessments)
          .values({
            propertyId,
            year,
            landValue: assessment.land.toString(),
            improvementValue: assessment.improvements.toString(),
            totalValue: assessment.total.toString(),
          })
          .onConflictDoUpdate({
            target: [
              schema.taxAssessments.propertyId,
              schema.taxAssessments.year,
            ],
            set: {
              landValue: assessment.land.toString(),
              improvementValue: assessment.improvements.toString(),
              totalValue: assessment.total.toString(),
            },
          });
      }
    }

    // Insert sale history
    if (data.saleHistory) {
      for (const sale of data.saleHistory) {
        if (!sale.date && !sale.price) continue;

        // Check for duplicate by date + price
        const existingSale = await this.db.query.saleHistory.findFirst({
          where: and(
            eq(schema.saleHistory.propertyId, propertyId),
            eq(schema.saleHistory.saleDate, sale.date),
          ),
        });

        if (!existingSale) {
          await this.db.insert(schema.saleHistory).values({
            propertyId,
            saleDate: sale.date,
            salePrice: sale.price,
            seller: sale.seller,
            buyer: sale.buyer,
            documentType: sale.type,
          });
        }
      }
    }

    this.logger.log(
      `Saved property from ${siteId}: ${normalizedAddress} (id=${propertyId})`,
    );
    return propertyId;
  }

  /**
   * Record a crawl job result in the audit table.
   */
  async recordCrawlJob(
    address: string,
    siteId: string,
    status: 'completed' | 'failed',
    propertyId?: number,
    error?: string,
  ): Promise<void> {
    await this.db.insert(schema.crawlJobs).values({
      address,
      siteId,
      status,
      propertyId: propertyId ?? null,
      lastError: error ?? null,
      crawledAt: status === 'completed' ? new Date() : null,
    });
  }

  /**
   * Find Maryland properties that haven't been crawled by SDAT recently.
   */
  async getPropertiesNeedingSdatCrawl(
    siteId: string,
    staleDays: number,
    limit: number,
  ): Promise<Array<{ id: number; address: string; county: string | null }>> {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    // Find properties in MD that either:
    // 1. Have no site_crawl_data for this siteId, or
    // 2. Have stale site_crawl_data (crawledAt < staleDate)
    const results = await this.db
      .select({
        id: schema.properties.id,
        address: schema.properties.address,
        county: schema.properties.county,
      })
      .from(schema.properties)
      .leftJoin(
        schema.siteCrawlData,
        and(
          eq(schema.siteCrawlData.propertyId, schema.properties.id),
          eq(schema.siteCrawlData.siteId, siteId),
        ),
      )
      .where(
        and(
          eq(schema.properties.state, 'MD'),
          or(
            isNull(schema.siteCrawlData.id),
            lt(schema.siteCrawlData.crawledAt, staleDate),
          ),
        ),
      )
      .limit(limit);

    return results;
  }
}
