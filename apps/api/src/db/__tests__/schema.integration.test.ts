import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../schema';

const { properties, taxAssessments, propertyTaxes, saleHistory } = schema;

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../../drizzle'),
  });
}, 120000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

describe('Schema Migration', () => {
  it('should create all tables with correct columns', async () => {
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name != '__drizzle_migrations'
      ORDER BY table_name
    `);

    const tableNames = result.rows.map((r) => r.table_name).sort();
    expect(tableNames).toEqual([
      'properties',
      'property_taxes',
      'sale_history',
      'tax_assessments',
    ]);
  });

  it('should have correct columns on properties table', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'properties'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map((r) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('rentcast_id');
    expect(columns).toContain('address');
    expect(columns).toContain('city');
    expect(columns).toContain('state');
    expect(columns).toContain('zip_code');
    expect(columns).toContain('latitude');
    expect(columns).toContain('longitude');
    expect(columns).toContain('property_type');
    expect(columns).toContain('year_built');
    expect(columns).toContain('square_footage');
    expect(columns).toContain('bedrooms');
    expect(columns).toContain('bathrooms');
    expect(columns).toContain('raw_response');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
    expect(columns).toContain('last_accessed_at');
    expect(columns).toContain('access_count');
  });

  it('should have unique index on properties.address', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'properties' AND indexname = 'properties_address_idx'
    `);
    expect(result.rows.length).toBe(1);
  });

  it('should have unique index on tax_assessments(property_id, year)', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'tax_assessments' AND indexname = 'tax_assessments_property_year_idx'
    `);
    expect(result.rows.length).toBe(1);
  });

  it('should have unique index on property_taxes(property_id, year)', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'property_taxes' AND indexname = 'property_taxes_property_year_idx'
    `);
    expect(result.rows.length).toBe(1);
  });
});

describe('Property CRUD', () => {
  it('should insert and read back a property with all fields', async () => {
    const [inserted] = await db
      .insert(properties)
      .values({
        rentcastId: 'test-id-1',
        address: '123 main st, test city, ts 12345',
        formattedAddress: '123 Main St, Test City, TS 12345',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        county: 'Test County',
        neighborhood: 'Test Neighborhood',
        subdivision: 'Test Subdivision',
        latitude: '39.1234567',
        longitude: '-76.1234567',
        propertyType: 'Single Family',
        yearBuilt: 2000,
        squareFootage: 2500,
        lotSize: 5000,
        bedrooms: 4,
        bathrooms: '2.5',
        stories: 2,
        basement: 'Full',
        garageSpaces: 2,
        lastSaleDate: '2020-01-15',
        lastSalePrice: 350000,
        ownerNames: 'John Doe, Jane Doe',
        ownerOccupied: true,
        hoaFee: '150.00',
        zoning: 'R-1',
        assessorId: 'ASR-001',
        legalDescription: 'Lot 1 Block 1',
        features: { floorCount: 2, basement: true },
        rawResponse: { id: 'test-id-1', full: 'response' },
      })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.address).toBe('123 main st, test city, ts 12345');
    expect(inserted.city).toBe('Test City');
    expect(inserted.state).toBe('TS');
    expect(inserted.yearBuilt).toBe(2000);
    expect(inserted.squareFootage).toBe(2500);
    expect(inserted.bedrooms).toBe(4);
    expect(inserted.bathrooms).toBe('2.5');
    expect(inserted.ownerOccupied).toBe(true);
    expect(inserted.accessCount).toBe(0);
    expect(inserted.createdAt).toBeInstanceOf(Date);

    // Read back
    const [found] = await db
      .select()
      .from(properties)
      .where(eq(properties.address, '123 main st, test city, ts 12345'));

    expect(found).toBeDefined();
    expect(found.rentcastId).toBe('test-id-1');
    expect(found.formattedAddress).toBe('123 Main St, Test City, TS 12345');

    // Cleanup
    await db.delete(properties).where(eq(properties.id, inserted.id));
  });
});

describe('Tax Assessments Relation', () => {
  it('should insert property with multiple year assessments and query with joins', async () => {
    const [prop] = await db
      .insert(properties)
      .values({
        address: 'tax-test-property',
        city: 'Test',
        state: 'TS',
      })
      .returning();

    await db.insert(taxAssessments).values([
      {
        propertyId: prop.id,
        year: 2022,
        landValue: '100000.00',
        improvementValue: '200000.00',
        totalValue: '300000.00',
      },
      {
        propertyId: prop.id,
        year: 2023,
        landValue: '110000.00',
        improvementValue: '210000.00',
        totalValue: '320000.00',
      },
    ]);

    const result = await db.query.properties.findFirst({
      where: eq(properties.id, prop.id),
      with: {
        taxAssessments: true,
      },
    });

    expect(result).toBeDefined();
    expect(result!.taxAssessments).toHaveLength(2);
    expect(result!.taxAssessments.map((a) => a.year).sort()).toEqual([2022, 2023]);
    expect(parseFloat(result!.taxAssessments.find((a) => a.year === 2023)!.totalValue!)).toBe(320000);

    // Cleanup
    await db.delete(properties).where(eq(properties.id, prop.id));
  });
});

describe('Property Taxes Relation', () => {
  it('should insert property with tax records and verify cascade delete', async () => {
    const [prop] = await db
      .insert(properties)
      .values({
        address: 'tax-cascade-test',
        city: 'Test',
        state: 'TS',
      })
      .returning();

    await db.insert(propertyTaxes).values([
      { propertyId: prop.id, year: 2022, total: '5000.00' },
      { propertyId: prop.id, year: 2023, total: '5200.00' },
    ]);

    // Verify taxes exist
    const taxes = await db
      .select()
      .from(propertyTaxes)
      .where(eq(propertyTaxes.propertyId, prop.id));
    expect(taxes).toHaveLength(2);

    // Delete property — should cascade
    await db.delete(properties).where(eq(properties.id, prop.id));

    // Verify taxes deleted
    const taxesAfter = await db
      .select()
      .from(propertyTaxes)
      .where(eq(propertyTaxes.propertyId, prop.id));
    expect(taxesAfter).toHaveLength(0);
  });
});

describe('Sale History', () => {
  it('should insert sale records and query ordered by date', async () => {
    const [prop] = await db
      .insert(properties)
      .values({
        address: 'sale-history-test',
        city: 'Test',
        state: 'TS',
      })
      .returning();

    await db.insert(saleHistory).values([
      {
        propertyId: prop.id,
        saleDate: '2018-05-10',
        salePrice: 250000,
        buyer: 'Alice',
        seller: 'Bob',
      },
      {
        propertyId: prop.id,
        saleDate: '2022-08-20',
        salePrice: 350000,
        buyer: 'Charlie',
        seller: 'Alice',
      },
    ]);

    const result = await db.query.properties.findFirst({
      where: eq(properties.id, prop.id),
      with: {
        saleHistory: true,
      },
    });

    expect(result).toBeDefined();
    expect(result!.saleHistory).toHaveLength(2);

    const sorted = result!.saleHistory.sort((a, b) =>
      (a.saleDate || '').localeCompare(b.saleDate || ''),
    );
    expect(sorted[0].salePrice).toBe(250000);
    expect(sorted[1].salePrice).toBe(350000);

    // Cleanup
    await db.delete(properties).where(eq(properties.id, prop.id));
  });
});

describe('Upsert', () => {
  it('should update on conflict when inserting same address', async () => {
    // First insert
    await db
      .insert(properties)
      .values({
        address: 'upsert-test-address',
        city: 'Old City',
        state: 'OC',
        yearBuilt: 1990,
        accessCount: 1,
      })
      .onConflictDoUpdate({
        target: properties.address,
        set: {
          city: 'Old City',
          state: 'OC',
          yearBuilt: 1990,
          updatedAt: new Date(),
          accessCount: sql`${properties.accessCount} + 1`,
        },
      });

    // Second insert (upsert)
    await db
      .insert(properties)
      .values({
        address: 'upsert-test-address',
        city: 'New City',
        state: 'NC',
        yearBuilt: 1995,
        accessCount: 1,
      })
      .onConflictDoUpdate({
        target: properties.address,
        set: {
          city: 'New City',
          state: 'NC',
          yearBuilt: 1995,
          updatedAt: new Date(),
          accessCount: sql`${properties.accessCount} + 1`,
        },
      });

    const [found] = await db
      .select()
      .from(properties)
      .where(eq(properties.address, 'upsert-test-address'));

    expect(found.city).toBe('New City');
    expect(found.state).toBe('NC');
    expect(found.yearBuilt).toBe(1995);
    expect(found.accessCount).toBe(2);

    // Cleanup
    await db.delete(properties).where(eq(properties.address, 'upsert-test-address'));
  });
});

describe('Cache Metadata', () => {
  it('should track access_count and last_accessed_at', async () => {
    const [prop] = await db
      .insert(properties)
      .values({
        address: 'cache-meta-test',
        city: 'Test',
        state: 'TS',
        accessCount: 0,
      })
      .returning();

    expect(prop.accessCount).toBe(0);
    expect(prop.lastAccessedAt).toBeNull();

    // Simulate access: increment count and update last_accessed_at
    const now = new Date();
    await db
      .update(properties)
      .set({
        accessCount: sql`${properties.accessCount} + 1`,
        lastAccessedAt: now,
      })
      .where(eq(properties.id, prop.id));

    const [updated] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, prop.id));

    expect(updated.accessCount).toBe(1);
    expect(updated.lastAccessedAt).toBeDefined();

    // Second access
    await db
      .update(properties)
      .set({
        accessCount: sql`${properties.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(properties.id, prop.id));

    const [updated2] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, prop.id));

    expect(updated2.accessCount).toBe(2);

    // Cleanup
    await db.delete(properties).where(eq(properties.id, prop.id));
  });
});
