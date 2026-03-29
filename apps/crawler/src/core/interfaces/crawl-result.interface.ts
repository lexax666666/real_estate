/**
 * Normalized property data output from any site adapter.
 * Maps to the shared Drizzle schema in apps/api.
 */
export interface ParsedPropertyData {
  // Core property fields (map to `properties` table)
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  ownerNames?: string;
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  lotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  basement?: string;
  garageSpaces?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  legalDescription?: string;
  neighborhood?: string;
  subdivision?: string;

  // Tax assessments (year-keyed, map to `tax_assessments` table)
  taxAssessments?: Record<
    string,
    {
      land: number;
      improvements: number;
      total: number;
    }
  >;

  // Sale history (map to `sale_history` table)
  saleHistory?: Array<{
    date: string;
    price: number;
    seller?: string;
    buyer?: string;
    type?: string;
    deedRef?: string;
  }>;

  // Site-specific extra data (stored in `site_crawl_data.raw_data` jsonb)
  siteSpecificData?: Record<string, any>;

  // Raw HTML for debugging/reparse
  rawHtml: string;
}
