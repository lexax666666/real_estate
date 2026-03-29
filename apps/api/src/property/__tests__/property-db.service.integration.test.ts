import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { PropertyDbService } from '../property-db.service';
import * as schema from '../../db/schema';

const { properties } = schema;

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: PropertyDbService;

// Sample transformed property data (matches transformRentCastResponse output)
const samplePropertyData = {
  address: '123 Main St',
  city: 'Columbia',
  state: 'MD',
  zipCode: '21045',
  ownerName: 'John Doe',
  propertyType: 'Single Family',
  yearBuilt: 2000,
  squareFootage: 2500,
  lotSize: 5000,
  bedrooms: 4,
  bathrooms: 2.5,
  stories: 2,
  basement: 'Full',
  garage: 2,
  lastSaleDate: '2020-01-15',
  lastSalePrice: 350000,
  assessedValue: {
    land: 100000,
    building: 200000,
    total: 300000,
  },
  assessedDate: 2023,
  neighborhood: 'Test Neighborhood',
  subdivision: 'Test Subdivision',
  county: 'Howard',
  latitude: 39.1234567,
  longitude: -76.1234567,
  taxAmount: 5200,
  hoaFee: 150,
  features: { floorCount: 2, basement: true },
  ownerOccupied: true,
  zoning: 'R-1',
  assessorID: 'ASR-001',
  legalDescription: 'Lot 1 Block 1',
  taxAssessments: {
    '2022': { land: 95000, improvements: 190000, value: 285000 },
    '2023': { land: 100000, improvements: 200000, value: 300000 },
  },
  propertyTaxes: {
    '2022': { total: 5000 },
    '2023': { total: 5200 },
  },
  history: [
    {
      date: '2018-05-10',
      price: 280000,
      buyer: 'John Doe',
      seller: 'Jane Smith',
      documentType: 'Warranty Deed',
      recordingDate: '2018-05-15',
    },
    {
      date: '2020-01-15',
      price: 350000,
      buyer: 'New Owner',
      seller: 'John Doe',
      documentType: 'Warranty Deed',
      recordingDate: '2020-01-20',
    },
  ],
};

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../../drizzle'),
  });

  // Create service with the test db instance (duck-typed as NeonHttpDatabase)
  service = new PropertyDbService(db as any);
}, 120000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

beforeEach(async () => {
  // Clean all tables between tests
  await db.delete(properties);
});

describe('getPropertyFromDB', () => {
  it('should return null for non-existent property', async () => {
    const result = await service.getPropertyFromDB('non-existent-address');
    expect(result).toBeNull();
  });

  it('should return data + related records for existing property', async () => {
    await service.savePropertyToDB('123 Main St, Columbia, MD 21045', samplePropertyData);

    const result = await service.getPropertyFromDB('123 Main St, Columbia, MD 21045');

    expect(result).not.toBeNull();
    expect(result.data).toBeDefined();
    expect(result.updatedAt).toBeDefined();
    expect(result.data.city).toBe('Columbia');
    expect(result.data.state).toBe('MD');
    expect(result.data.taxAssessments).toBeDefined();
    expect(result.data.propertyTaxes).toBeDefined();
    expect(result.data.history).toBeDefined();
  });
});

describe('savePropertyToDB', () => {
  it('should store normalized data across all tables', async () => {
    const saved = await service.savePropertyToDB(
      '456 Oak Ave, Baltimore, MD 21201',
      samplePropertyData,
    );

    expect(saved).toBe(true);

    // Verify data is in the properties table
    const result = await service.getPropertyFromDB('456 Oak Ave, Baltimore, MD 21201');
    expect(result).not.toBeNull();
    expect(result.data.city).toBe('Columbia');
    expect(result.data.bedrooms).toBe(4);

    // Verify tax assessments
    expect(Object.keys(result.data.taxAssessments)).toHaveLength(2);
    expect(result.data.taxAssessments['2023'].value).toBe(300000);

    // Verify property taxes
    expect(Object.keys(result.data.propertyTaxes)).toHaveLength(2);
    expect(result.data.propertyTaxes['2023'].total).toBe(5200);

    // Verify sale history
    expect(result.data.history).toHaveLength(2);
  });

  it('should upsert correctly on duplicate address', async () => {
    await service.savePropertyToDB('upsert-test', samplePropertyData);

    const updatedData = {
      ...samplePropertyData,
      city: 'Updated City',
      bedrooms: 5,
    };
    await service.savePropertyToDB('upsert-test', updatedData);

    const result = await service.getPropertyFromDB('upsert-test');
    expect(result.data.city).toBe('Updated City');
    expect(result.data.bedrooms).toBe(5);
  });
});

describe('API response shape test', () => {
  it('should produce output matching transformRentCastResponse format', async () => {
    await service.savePropertyToDB('response-shape-test', samplePropertyData);
    const result = await service.getPropertyFromDB('response-shape-test');
    const data = result.data;

    // Verify all expected fields exist
    expect(data).toHaveProperty('address');
    expect(data).toHaveProperty('city');
    expect(data).toHaveProperty('state');
    expect(data).toHaveProperty('zipCode');
    expect(data).toHaveProperty('ownerName');
    expect(data).toHaveProperty('propertyType');
    expect(data).toHaveProperty('yearBuilt');
    expect(data).toHaveProperty('squareFootage');
    expect(data).toHaveProperty('lotSize');
    expect(data).toHaveProperty('bedrooms');
    expect(data).toHaveProperty('bathrooms');
    expect(data).toHaveProperty('stories');
    expect(data).toHaveProperty('basement');
    expect(data).toHaveProperty('garage');
    expect(data).toHaveProperty('lastSaleDate');
    expect(data).toHaveProperty('lastSalePrice');
    expect(data).toHaveProperty('assessedValue');
    expect(data.assessedValue).toHaveProperty('land');
    expect(data.assessedValue).toHaveProperty('building');
    expect(data.assessedValue).toHaveProperty('total');
    expect(data).toHaveProperty('assessedDate');
    expect(data).toHaveProperty('neighborhood');
    expect(data).toHaveProperty('subdivision');
    expect(data).toHaveProperty('county');
    expect(data).toHaveProperty('latitude');
    expect(data).toHaveProperty('longitude');
    expect(data).toHaveProperty('taxAmount');
    expect(data).toHaveProperty('hoaFee');
    expect(data).toHaveProperty('features');
    expect(data).toHaveProperty('ownerOccupied');
    expect(data).toHaveProperty('zoning');
    expect(data).toHaveProperty('assessorID');
    expect(data).toHaveProperty('legalDescription');
    expect(data).toHaveProperty('taxAssessments');
    expect(data).toHaveProperty('propertyTaxes');
    expect(data).toHaveProperty('history');

    // Verify values match what was saved
    expect(data.city).toBe('Columbia');
    expect(data.state).toBe('MD');
    expect(data.zipCode).toBe('21045');
    expect(data.ownerName).toBe('John Doe');
    expect(data.yearBuilt).toBe(2000);
    expect(data.squareFootage).toBe(2500);
    expect(data.bedrooms).toBe(4);
    expect(data.bathrooms).toBe(2.5);
    expect(data.assessedValue.land).toBe(100000);
    expect(data.assessedValue.building).toBe(200000);
    expect(data.assessedValue.total).toBe(300000);
    expect(data.assessedDate).toBe(2023);
    expect(data.latitude).toBeCloseTo(39.1234567, 5);
    expect(data.longitude).toBeCloseTo(-76.1234567, 5);
  });
});

describe('isCacheFresh', () => {
  it('should return true for recent data', () => {
    const now = new Date();
    expect(service.isCacheFresh(now)).toBe(true);
  });

  it('should return false for stale data', () => {
    const old = new Date();
    old.setHours(old.getHours() - 25);
    expect(service.isCacheFresh(old)).toBe(false);
  });

  it('should respect custom maxAgeHours', () => {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    expect(service.isCacheFresh(twoHoursAgo, 1)).toBe(false);
    expect(service.isCacheFresh(twoHoursAgo, 3)).toBe(true);
  });
});

describe('cleanupStaleCache', () => {
  it('should delete old entries and cascade to related tables', async () => {
    // Insert a property
    await service.savePropertyToDB('old-property', samplePropertyData);

    // Manually set updated_at to 100 days ago
    await db
      .update(properties)
      .set({
        updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      });

    const deleted = await service.cleanupStaleCache(90);
    expect(deleted).toBe(1);

    // Verify property is gone
    const result = await service.getPropertyFromDB('old-property');
    expect(result).toBeNull();
  });

  it('should not delete recent entries', async () => {
    await service.savePropertyToDB('recent-property', samplePropertyData);

    const deleted = await service.cleanupStaleCache(90);
    expect(deleted).toBe(0);

    const result = await service.getPropertyFromDB('recent-property');
    expect(result).not.toBeNull();
  });
});

describe('getCacheStats', () => {
  it('should return correct aggregates', async () => {
    await service.savePropertyToDB('stats-test-1', samplePropertyData);
    await service.savePropertyToDB('stats-test-2', samplePropertyData);

    const stats = await service.getCacheStats();
    expect(stats).not.toBeNull();
    expect(stats!.totalProperties).toBe(2);
    expect(stats!.avgAccessCount).toBeGreaterThanOrEqual(1);
    expect(stats!.oldestEntry).toBeInstanceOf(Date);
    expect(stats!.newestEntry).toBeInstanceOf(Date);
  });

  it('should return zero stats for empty database', async () => {
    const stats = await service.getCacheStats();
    expect(stats).not.toBeNull();
    expect(stats!.totalProperties).toBe(0);
  });
});
