import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { PropertyDbService, SearchResult } from '../property-db.service';
import { AddressParserService } from '../address-parser.service';
import * as schema from '../../db/schema';

const { properties } = schema;

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: PropertyDbService;
let addressParser: AddressParserService;

// Seed data that covers all test cases
const seedAddresses = [
  {
    address: '9354 westering sun dr',
    formattedAddress: '9354 Westering Sun Dr, Columbia, MD 21045',
    city: 'columbia',
    state: 'MD',
    zipCode: '21045',
  },
  {
    address: '123 main st',
    formattedAddress: '123 Main St, Springfield, IL 62701',
    city: 'springfield',
    state: 'IL',
    zipCode: '62701',
  },
  {
    address: '435 christopher ave',
    formattedAddress: '435 Christopher Ave, Gaithersburg, MD 20879',
    city: 'gaithersburg',
    state: 'MD',
    zipCode: '20879',
  },
  {
    address: '100 north main street',
    formattedAddress: '100 North Main Street, Anytown, CA 90210',
    city: 'anytown',
    state: 'CA',
    zipCode: '90210',
  },
  {
    address: '500 maple ave',
    formattedAddress: '500 Maple Ave, Oak Park, IL 60302',
    city: 'oak park',
    state: 'IL',
    zipCode: '60302',
  },
  {
    address: '9355 westering sun dr',
    formattedAddress: '9355 Westering Sun Dr, Columbia, MD 21045',
    city: 'columbia',
    state: 'MD',
    zipCode: '21045',
  },
  {
    address: '200 main st nw',
    formattedAddress: '200 Main St NW, Washington, DC 20001',
    city: 'washington',
    state: 'DC',
    zipCode: '20001',
  },
  {
    address: '1423 wheaton ln',
    formattedAddress: '1423 Wheaton Ln, Silver Spring, MD 20902',
    city: 'silver spring',
    state: 'MD',
    zipCode: '20902',
  },
];

beforeAll(async () => {
  // Use ParadeDB image which includes pg_search extension
  container = await new PostgreSqlContainer('paradedb/paradedb:latest').start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool, { schema });

  // Run Drizzle schema migrations (creates tables)
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../../drizzle'),
  });

  // Create BM25 index (from our 0003 migration — ParadeDB image already has pg_search)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS properties_bm25_idx ON properties
    USING bm25 (id, address, formatted_address, city, state, zip_code)
    WITH (key_field = 'id');
  `);

  // Seed data
  for (const addr of seedAddresses) {
    await db.insert(properties).values({
      address: addr.address,
      formattedAddress: addr.formattedAddress,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      accessCount: 0,
    });
  }

  addressParser = new AddressParserService();
  service = new PropertyDbService(db as any, addressParser);
}, 120000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

// Helper to find address in results
function findInResults(results: SearchResult[], address: string): SearchResult | undefined {
  return results.find((r) => r.address === address);
}

describe('ParadeDB Search Integration Tests', () => {
  // ────────────────────────────────────────────────────────────────
  // A. Exact / baseline
  // ────────────────────────────────────────────────────────────────
  describe('A. Exact / baseline', () => {
    it('should match exact address: 9354 westering sun dr', async () => {
      const { results } = await service.searchProperties('9354 westering sun dr');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
      expect(results[0].score).toBeGreaterThan(5);
    });

    it('should match with city/state: 9354 Westering Sun Dr, Columbia MD 21045', async () => {
      const { results } = await service.searchProperties(
        '9354 Westering Sun Dr, Columbia MD 21045',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // B. Case + formatting tolerance
  // ────────────────────────────────────────────────────────────────
  describe('B. Case + formatting tolerance', () => {
    it('should match uppercase: 9354 WESTERING SUN DR', async () => {
      const { results } = await service.searchProperties('9354 WESTERING SUN DR');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should match mixed case: 9354 Westering Sun Dr', async () => {
      const { results } = await service.searchProperties('9354 Westering Sun Dr');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should match hyphenated: 9354-westering-sun-dr', async () => {
      const { results } = await service.searchProperties('9354-westering-sun-dr');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should match comma-separated: 9354, westering sun dr', async () => {
      const { results } = await service.searchProperties('9354, westering sun dr');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // C. Missing parts
  // ────────────────────────────────────────────────────────────────
  describe('C. Missing parts', () => {
    it('should find with just street name: westering sun', async () => {
      const { results } = await service.searchProperties('westering sun');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '9354 westering sun dr');
      expect(found).toBeDefined();
    });

    it('should find with number + partial: 9354 westering', async () => {
      const { results } = await service.searchProperties('9354 westering');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should find with city + state + zip: columbia md 21045', async () => {
      const { results } = await service.searchProperties('columbia md 21045');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '9354 westering sun dr');
      expect(found).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // D. Reordered input
  // ────────────────────────────────────────────────────────────────
  describe('D. Reordered input', () => {
    it('should match reordered: westering sun 9354', async () => {
      const { results } = await service.searchProperties('westering sun 9354');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should match heavily reordered: md columbia 9354 westering sun', async () => {
      const { results } = await service.searchProperties(
        'md columbia 9354 westering sun',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // E. Abbreviation normalization
  // ────────────────────────────────────────────────────────────────
  describe('E. Abbreviation normalization', () => {
    it('should match "street" when stored as "st": 123 main street', async () => {
      const { results } = await service.searchProperties('123 main street');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '123 main st');
      expect(found).toBeDefined();
      // Should be top result or near top
      const idx = results.findIndex((r) => r.address === '123 main st');
      expect(idx).toBeLessThanOrEqual(2);
    });

    it('should match "avenue" when stored as "ave": 500 maple avenue', async () => {
      const { results } = await service.searchProperties('500 maple avenue');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '500 maple ave');
      expect(found).toBeDefined();
    });

    it('should match "north" when stored as direction: 100 n main street', async () => {
      const { results } = await service.searchProperties('100 n main street');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '100 north main street');
      expect(found).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // F. Typos (CRITICAL)
  // ────────────────────────────────────────────────────────────────
  describe('F. Typos', () => {
    it('should find "westering son dr" → "westering sun dr" (1-char typo)', async () => {
      const { results } = await service.searchProperties(
        '9354 westering son dr',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should find "maim st" → "main st" (1-char typo)', async () => {
      const { results } = await service.searchProperties('123 maim st');
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '123 main st');
      expect(found).toBeDefined();
    });

    it('should find "colubmia md" → "columbia md" (transposition)', async () => {
      const { results } = await service.searchProperties(
        '9354 westering sun colubmia md',
      );
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '9354 westering sun dr');
      expect(found).toBeDefined();
    });

    it('should find partial zip: 2104 for 21045', async () => {
      // 2104 is 4 digits, classified as house_number
      // This is a known limitation — partial zip doesn't get special treatment
      // But it should still help narrow results when combined with other terms
      const { results } = await service.searchProperties(
        '9354 westering sun 2104',
      );
      expect(results.length).toBeGreaterThan(0);
      const found = findInResults(results, '9354 westering sun dr');
      expect(found).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // G. Partial typing (autocomplete)
  // ────────────────────────────────────────────────────────────────
  describe('G. Partial typing (autocomplete)', () => {
    it('should autocomplete "9354 we" → westering sun dr', async () => {
      const results = await service.autocompleteProperties('9354 we');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should autocomplete "west" → westering sun dr', async () => {
      const results = await service.autocompleteProperties('west');
      expect(results.length).toBeGreaterThan(0);
      const found = results.find((r) => r.address.includes('westering'));
      expect(found).toBeDefined();
    });

    it('should autocomplete "9354 westering s" → narrow results', async () => {
      const results = await service.autocompleteProperties('9354 westering s');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should autocomplete "123 ma" → main st', async () => {
      const results = await service.autocompleteProperties('123 ma');
      expect(results.length).toBeGreaterThan(0);
      const found = results.find((r) => r.address === '123 main st');
      expect(found).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      const results = await service.autocompleteProperties('main', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // H. House number importance
  // ────────────────────────────────────────────────────────────────
  describe('H. House number importance', () => {
    it('should rank 9354 higher than 9355 when searching for 9354', async () => {
      const { results } = await service.searchProperties(
        '9354 westering sun',
      );
      expect(results.length).toBeGreaterThanOrEqual(2);

      const exact = findInResults(results, '9354 westering sun dr');
      const nearby = findInResults(results, '9355 westering sun dr');

      expect(exact).toBeDefined();
      expect(nearby).toBeDefined();
      expect(exact!.score).toBeGreaterThan(nearby!.score);
    });

    it('should still return nearby house number but with lower rank', async () => {
      const { results } = await service.searchProperties(
        '9355 westering sun',
      );
      expect(results.length).toBeGreaterThanOrEqual(2);

      const exact = findInResults(results, '9355 westering sun dr');
      const other = findInResults(results, '9354 westering sun dr');

      expect(exact).toBeDefined();
      expect(other).toBeDefined();
      expect(exact!.score).toBeGreaterThan(other!.score);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // I. Noise / extra words
  // ────────────────────────────────────────────────────────────────
  describe('I. Noise / extra words', () => {
    it('should handle "house at 9354 westering sun dr"', async () => {
      const { results } = await service.searchProperties(
        'house at 9354 westering sun dr',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('should handle "my address is 9354 westering sun"', async () => {
      const { results } = await service.searchProperties(
        'my address is 9354 westering sun',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // J. Wrong but close
  // ────────────────────────────────────────────────────────────────
  describe('J. Wrong but close', () => {
    it('should find "9354 westering moon dr" with lower score', async () => {
      const { results: moonResults } = await service.searchProperties(
        '9354 westering moon dr',
      );
      const { results: sunResults } = await service.searchProperties(
        '9354 westering sun dr',
      );

      // Should still find the property
      expect(moonResults.length).toBeGreaterThan(0);
      const moonMatch = findInResults(moonResults, '9354 westering sun dr');
      expect(moonMatch).toBeDefined();

      // But with lower score than exact match
      const sunMatch = findInResults(sunResults, '9354 westering sun dr');
      expect(sunMatch).toBeDefined();
      expect(moonMatch!.score).toBeLessThan(sunMatch!.score);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Hybrid response behavior
  // ────────────────────────────────────────────────────────────────
  describe('Hybrid response (auto-select vs list)', () => {
    it('should auto-select when top result has high confidence', async () => {
      const response = await service.searchProperties(
        '9354 westering sun dr columbia md 21045',
      );
      // With full address, score should be very high
      expect(response.results.length).toBeGreaterThan(0);
      if (response.results[0].score >= 5.0) {
        expect(response.autoSelected).toBe(true);
        expect(response.topMatch).not.toBeNull();
      }
    });

    it('should not auto-select for vague queries', async () => {
      const response = await service.searchProperties('main');
      // Vague query should return multiple results with lower scores
      expect(response.results.length).toBeGreaterThan(0);
      if (response.results[0].score < 5.0) {
        expect(response.autoSelected).toBe(false);
        expect(response.topMatch).toBeNull();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Edge cases
  // ────────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('should return empty results for gibberish', async () => {
      const { results } = await service.searchProperties('xyzzy plugh');
      // May return results with very low scores if fuzzy matches, or empty
      if (results.length > 0) {
        expect(results[0].score).toBeLessThan(2);
      }
    });

    it('should return empty results for empty query', async () => {
      const { results } = await service.searchProperties('');
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const { results } = await service.searchProperties('main', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle SQL injection attempt safely', async () => {
      const { results } = await service.searchProperties(
        "'; DROP TABLE properties; --",
      );
      // Should not crash, should return empty or low results
      expect(Array.isArray(results)).toBe(true);
    });

    it('autocomplete should return empty for empty query', async () => {
      const results = await service.autocompleteProperties('');
      expect(results).toEqual([]);
    });

    it('should include score in results', async () => {
      const { results } = await service.searchProperties(
        '9354 westering sun dr',
      );
      expect(results.length).toBeGreaterThan(0);
      expect(typeof results[0].score).toBe('number');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should include all expected fields in search results', async () => {
      const { results } = await service.searchProperties(
        '9354 westering sun dr',
      );
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('formattedAddress');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('zipCode');
      expect(result).toHaveProperty('score');
    });
  });
});
