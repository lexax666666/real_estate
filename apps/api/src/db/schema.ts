import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  boolean,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const properties = pgTable(
  'properties',
  {
    id: serial('id').primaryKey(),
    rentcastId: varchar('rentcast_id'),
    address: varchar('address').notNull(),
    formattedAddress: varchar('formatted_address'),
    city: varchar('city'),
    state: varchar('state', { length: 2 }),
    zipCode: varchar('zip_code', { length: 10 }),
    county: varchar('county'),
    neighborhood: varchar('neighborhood'),
    subdivision: varchar('subdivision'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    propertyType: varchar('property_type'),
    yearBuilt: integer('year_built'),
    squareFootage: integer('square_footage'),
    lotSize: integer('lot_size'),
    bedrooms: integer('bedrooms'),
    bathrooms: numeric('bathrooms', { precision: 4, scale: 1 }),
    stories: integer('stories'),
    basement: varchar('basement'),
    garageSpaces: integer('garage_spaces'),
    lastSaleDate: varchar('last_sale_date'),
    lastSalePrice: integer('last_sale_price'),
    ownerNames: varchar('owner_names'),
    ownerOccupied: boolean('owner_occupied'),
    hoaFee: numeric('hoa_fee', { precision: 10, scale: 2 }),
    zoning: varchar('zoning'),
    assessorId: varchar('assessor_id'),
    legalDescription: text('legal_description'),
    features: jsonb('features'),
    rawResponse: jsonb('raw_response'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at'),
    accessCount: integer('access_count').default(0).notNull(),
    dataSource: varchar('data_source', { length: 20 }),
  },
  (table) => [uniqueIndex('properties_address_idx').on(table.address)],
);

export const taxAssessments = pgTable(
  'tax_assessments',
  {
    id: serial('id').primaryKey(),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    landValue: numeric('land_value', { precision: 12, scale: 2 }),
    improvementValue: numeric('improvement_value', { precision: 12, scale: 2 }),
    totalValue: numeric('total_value', { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex('tax_assessments_property_year_idx').on(
      table.propertyId,
      table.year,
    ),
  ],
);

export const propertyTaxes = pgTable(
  'property_taxes',
  {
    id: serial('id').primaryKey(),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex('property_taxes_property_year_idx').on(
      table.propertyId,
      table.year,
    ),
  ],
);

export const saleHistory = pgTable('sale_history', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  saleDate: varchar('sale_date'),
  salePrice: integer('sale_price'),
  buyer: varchar('buyer'),
  seller: varchar('seller'),
  documentType: varchar('document_type'),
  recordingDate: varchar('recording_date'),
});

// Generic table for extended data from any crawl site (1 row per property per site)
export const siteCrawlData = pgTable(
  'site_crawl_data',
  {
    id: serial('id').primaryKey(),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    siteId: varchar('site_id', { length: 50 }).notNull(),
    rawHtml: text('raw_html'),
    rawData: jsonb('raw_data'),
    crawledAt: timestamp('crawled_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('site_crawl_data_property_site_idx').on(
      table.propertyId,
      table.siteId,
    ),
  ],
);

// Audit trail for crawl jobs (complements BullMQ's in-memory tracking)
export const crawlJobs = pgTable('crawl_jobs', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').references(() => properties.id, {
    onDelete: 'set null',
  }),
  address: varchar('address').notNull(),
  siteId: varchar('site_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  crawledAt: timestamp('crawled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// UNLOGGED staging table for CSV bulk import (COPY FROM STDIN)
export const stagingParcels = pgTable('staging_parcels', {
  rowNum: serial('row_num').primaryKey(),
  address: varchar('address').notNull(),
  city: varchar('city'),
  zipCode: varchar('zip_code', { length: 10 }),
  county: varchar('county'),
  ownerName1: varchar('owner_name_1'),
  ownerName2: varchar('owner_name_2'),
  propertyType: varchar('property_type'),
  yearBuilt: integer('year_built'),
  squareFootage: integer('square_footage'),
  landArea: numeric('land_area', { precision: 14, scale: 4 }),
  landUnit: varchar('land_unit', { length: 2 }),
  bldgStory: numeric('bldg_story', { precision: 5, scale: 1 }),
  descStyle: varchar('desc_style'),
  ooi: varchar('ooi', { length: 2 }),
  legal1: varchar('legal1'),
  legal2: varchar('legal2'),
  legal3: varchar('legal3'),
  zoning: varchar('zoning'),
  assessorId: varchar('assessor_id'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  saleDate: varchar('sale_date', { length: 10 }),
  salePrice: integer('sale_price'),
  seller: varchar('seller'),
  documentType: varchar('document_type'),
  nfmLandValue: numeric('nfm_land_value', { precision: 12, scale: 2 }),
  nfmImprovementValue: numeric('nfm_improvement_value', { precision: 12, scale: 2 }),
  nfmTotalValue: numeric('nfm_total_value', { precision: 12, scale: 2 }),
  subdivision: varchar('subdivision'),
  rawData: jsonb('raw_data'),
});

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  taxAssessments: many(taxAssessments),
  propertyTaxes: many(propertyTaxes),
  saleHistory: many(saleHistory),
  siteCrawlData: many(siteCrawlData),
}));

export const taxAssessmentsRelations = relations(
  taxAssessments,
  ({ one }) => ({
    property: one(properties, {
      fields: [taxAssessments.propertyId],
      references: [properties.id],
    }),
  }),
);

export const propertyTaxesRelations = relations(propertyTaxes, ({ one }) => ({
  property: one(properties, {
    fields: [propertyTaxes.propertyId],
    references: [properties.id],
  }),
}));

export const saleHistoryRelations = relations(saleHistory, ({ one }) => ({
  property: one(properties, {
    fields: [saleHistory.propertyId],
    references: [properties.id],
  }),
}));

export const siteCrawlDataRelations = relations(siteCrawlData, ({ one }) => ({
  property: one(properties, {
    fields: [siteCrawlData.propertyId],
    references: [properties.id],
  }),
}));

export const crawlJobsRelations = relations(crawlJobs, ({ one }) => ({
  property: one(properties, {
    fields: [crawlJobs.propertyId],
    references: [properties.id],
  }),
}));
