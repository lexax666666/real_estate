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

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  taxAssessments: many(taxAssessments),
  propertyTaxes: many(propertyTaxes),
  saleHistory: many(saleHistory),
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
