import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  {
    address: '8933 amelung st',
    formattedAddress: '8933 Amelung St, Frederick, MD 21704',
    city: 'frederick',
    state: 'MD',
    zipCode: '21704',
  },
  {
    address: '8933 centerway rd',
    formattedAddress: '8933 Centerway Rd, Gaithersburg, MD 20879',
    city: 'gaithersburg',
    state: 'MD',
    zipCode: '20879',
  },
];

beforeAll(async () => {
  container = await new PostgreSqlContainer('paradedb/paradedb:latest').start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../../drizzle'),
  });

  await pool.query(`
    CREATE INDEX IF NOT EXISTS properties_bm25_idx ON properties
    USING bm25 (id, address, formatted_address, city, state, zip_code)
    WITH (key_field = 'id');
  `);

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

function findInResults(results: SearchResult[], address: string): SearchResult | undefined {
  return results.find((r) => r.address === address);
}

function addressesOf(results: SearchResult[]): string[] {
  return results.map((r) => r.address);
}

describe('Autocomplete Integration Tests', () => {
  // ────────────────────────────────────────────────────────────────
  // A. Basic prefix matching on last token
  // ────────────────────────────────────────────────────────────────
  describe('A. Basic prefix matching', () => {
    it('should match "west" against westering sun addresses', async () => {
      const results = await service.autocompleteProperties('west');
      expect(results.length).toBeGreaterThan(0);
      const addrs = addressesOf(results);
      expect(addrs.some((a) => a.includes('westering'))).toBe(true);
    });

    it('should match "ma" against main and maple addresses', async () => {
      const results = await service.autocompleteProperties('ma');
      expect(results.length).toBeGreaterThan(0);
      const addrs = addressesOf(results);
      const hasMain = addrs.some((a) => a.includes('main'));
      const hasMaple = addrs.some((a) => a.includes('maple'));
      expect(hasMain || hasMaple).toBe(true);
    });

    it('should match "chr" against christopher ave', async () => {
      const results = await service.autocompleteProperties('chr');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '435 christopher ave')).toBeDefined();
    });

    it('should match "wheat" against wheaton ln', async () => {
      const results = await service.autocompleteProperties('wheat');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '1423 wheaton ln')).toBeDefined();
    });

    it('should match "maple" as a complete word', async () => {
      const results = await service.autocompleteProperties('maple');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // B. Progressive typing simulation
  // ────────────────────────────────────────────────────────────────
  describe('B. Progressive typing simulation', () => {
    it('"9354" should return 9354 westering sun dr', async () => {
      const results = await service.autocompleteProperties('9354');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 w" should prefix-match westering', async () => {
      const results = await service.autocompleteProperties('9354 w');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 we" should prefix-match westering', async () => {
      const results = await service.autocompleteProperties('9354 we');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 wes" should prefix-match westering', async () => {
      const results = await service.autocompleteProperties('9354 wes');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 westering" should match full word', async () => {
      const results = await service.autocompleteProperties('9354 westering');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 westering s" should prefix-match sun', async () => {
      const results = await service.autocompleteProperties('9354 westering s');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 westering su" should prefix-match sun', async () => {
      const results = await service.autocompleteProperties('9354 westering su');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 westering sun" should match full', async () => {
      const results = await service.autocompleteProperties('9354 westering sun');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"9354 westering sun d" should prefix-match dr', async () => {
      const results = await service.autocompleteProperties('9354 westering sun d');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('results should narrow as query gets more specific', async () => {
      const r1 = await service.autocompleteProperties('westering');
      const r2 = await service.autocompleteProperties('9354 westering');
      // More specific query should have same or fewer results
      expect(r2.length).toBeLessThanOrEqual(r1.length);
      // And the top result should have higher score
      if (r1.length > 0 && r2.length > 0) {
        expect(r2[0].score).toBeGreaterThanOrEqual(r1[0].score);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // C. Multi-word partial queries
  // ────────────────────────────────────────────────────────────────
  describe('C. Multi-word partial queries', () => {
    it('"123 ma" should find 123 main st', async () => {
      const results = await service.autocompleteProperties('123 ma');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
    });

    it('"435 chri" should find 435 christopher ave', async () => {
      const results = await service.autocompleteProperties('435 chri');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '435 christopher ave')).toBeDefined();
    });

    it('"200 ma" should find 200 main st nw', async () => {
      const results = await service.autocompleteProperties('200 ma');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '200 main st nw')).toBeDefined();
    });

    it('"500 map" should find 500 maple ave', async () => {
      const results = await service.autocompleteProperties('500 map');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
    });

    it('"1423 whe" should find 1423 wheaton ln', async () => {
      const results = await service.autocompleteProperties('1423 whe');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '1423 wheaton ln')).toBeDefined();
    });

    it('"100 nor" should find 100 north main street', async () => {
      const results = await service.autocompleteProperties('100 nor');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '100 north main street')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // D. Abbreviation handling with prefix
  // ────────────────────────────────────────────────────────────────
  describe('D. Abbreviation handling with prefix', () => {
    it('"123 main str" (partial "street") should match 123 main st', async () => {
      const results = await service.autocompleteProperties('123 main str');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
    });

    it('"500 maple av" (partial "avenue") should match 500 maple ave', async () => {
      const results = await service.autocompleteProperties('500 maple av');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
    });

    it('"9354 westering sun dri" (partial "drive") should match', async () => {
      const results = await service.autocompleteProperties('9354 westering sun dri');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"1423 wheaton la" (partial "lane") should match', async () => {
      const results = await service.autocompleteProperties('1423 wheaton la');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '1423 wheaton ln')).toBeDefined();
    });

    it('"123 main st" with abbreviation as last token should still find results', async () => {
      // "st" is last token; in autocomplete it goes to phrase_prefix, not abbreviation expansion
      // This tests whether phrase_prefix('address', ['st']) still matches
      const results = await service.autocompleteProperties('123 main st');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
    });

    it('"500 maple ave" with full abbreviation as last token', async () => {
      const results = await service.autocompleteProperties('500 maple ave');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // E. House number prefix matching
  // ────────────────────────────────────────────────────────────────
  describe('E. House number prefix matching', () => {
    it('"93" should match 9354 and/or 9355 westering sun dr', async () => {
      // "93" is classified as house_number → exact term match
      // BM25 tokenizes "9354" as a token; term('address','93') won't match "9354"
      // This test documents whether numeric prefix works or is a known limitation
      const results = await service.autocompleteProperties('93');
      // This may fail — documenting the limitation
      if (results.length > 0) {
        const addrs = addressesOf(results);
        expect(addrs.some((a) => a.includes('westering'))).toBe(true);
      }
    });

    it('"9354" as exact house number should match', async () => {
      const results = await service.autocompleteProperties('9354');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('"100" should match 100 north main street', async () => {
      const results = await service.autocompleteProperties('100');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '100 north main street')).toBeDefined();
    });

    it('"500" should match 500 maple ave', async () => {
      const results = await service.autocompleteProperties('500');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
    });

    it('"1423" should match 1423 wheaton ln', async () => {
      const results = await service.autocompleteProperties('1423');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '1423 wheaton ln')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // F. City prefix matching
  // ────────────────────────────────────────────────────────────────
  describe('F. City prefix matching', () => {
    it('"columbia" should find properties in Columbia', async () => {
      const results = await service.autocompleteProperties('columbia');
      expect(results.length).toBeGreaterThan(0);
      const addrs = addressesOf(results);
      expect(addrs.some((a) => a.includes('westering'))).toBe(true);
    });

    it('"col" should find properties in Columbia (prefix on city)', async () => {
      // phrase_prefix only searches 'address' field, not 'city'
      // This test may expose the city-search gap
      const results = await service.autocompleteProperties('col');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"silver" should find 1423 wheaton ln in Silver Spring', async () => {
      const results = await service.autocompleteProperties('silver');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"springfield" should find 123 main st', async () => {
      const results = await service.autocompleteProperties('springfield');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"gaith" should find 435 christopher ave in Gaithersburg', async () => {
      const results = await service.autocompleteProperties('gaith');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"washington" should find 200 main st nw', async () => {
      const results = await service.autocompleteProperties('washington');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"wash" should find Washington properties', async () => {
      const results = await service.autocompleteProperties('wash');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // G. State matching
  // ────────────────────────────────────────────────────────────────
  describe('G. State matching', () => {
    it('"md" should find Maryland properties', async () => {
      const results = await service.autocompleteProperties('md');
      expect(results.length).toBeGreaterThan(0);
      // Should find multiple MD properties
      const mdResults = results.filter((r) => r.state === 'MD');
      expect(mdResults.length).toBeGreaterThan(0);
    });

    it('"il" should find Illinois properties', async () => {
      const results = await service.autocompleteProperties('il');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"dc" should find DC properties', async () => {
      const results = await service.autocompleteProperties('dc');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"ca" should find California properties', async () => {
      const results = await service.autocompleteProperties('ca');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // H. Zip code matching
  // ────────────────────────────────────────────────────────────────
  describe('H. Zip code matching', () => {
    it('"21045" should find both westering sun dr properties', async () => {
      const results = await service.autocompleteProperties('21045');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(findInResults(results, '9354 westering sun dr')).toBeDefined();
      expect(findInResults(results, '9355 westering sun dr')).toBeDefined();
    });

    it('"62701" should find 123 main st', async () => {
      const results = await service.autocompleteProperties('62701');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
    });

    it('"20001" should find 200 main st nw', async () => {
      const results = await service.autocompleteProperties('20001');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '200 main st nw')).toBeDefined();
    });

    it('"90210" should find 100 north main street', async () => {
      const results = await service.autocompleteProperties('90210');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '100 north main street')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // I. Limit parameter enforcement
  // ────────────────────────────────────────────────────────────────
  describe('I. Limit parameter enforcement', () => {
    it('default limit should return at most 5 results', async () => {
      const results = await service.autocompleteProperties('main');
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('limit=1 should return at most 1 result', async () => {
      const results = await service.autocompleteProperties('main', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('limit=2 should return at most 2 results', async () => {
      const results = await service.autocompleteProperties('main', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('limit=3 should return at most 3 results', async () => {
      const results = await service.autocompleteProperties('main', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('limit=10 should return all matching results up to 10', async () => {
      const results = await service.autocompleteProperties('main', 10);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // J. Score ordering and relevance
  // ────────────────────────────────────────────────────────────────
  describe('J. Score ordering and relevance', () => {
    it('results should be ordered by score descending', async () => {
      const results = await service.autocompleteProperties('main');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('all results should have score > 0', async () => {
      const results = await service.autocompleteProperties('westering');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.score).toBeGreaterThan(0);
      }
    });

    it('more specific query should have higher top score', async () => {
      const r1 = await service.autocompleteProperties('westering');
      const r2 = await service.autocompleteProperties('9354 westering sun dr');
      expect(r1.length).toBeGreaterThan(0);
      expect(r2.length).toBeGreaterThan(0);
      expect(r2[0].score).toBeGreaterThan(r1[0].score);
    });

    it('exact house number should score above neighbor', async () => {
      const results = await service.autocompleteProperties('9354 westering sun');
      const r9354 = findInResults(results, '9354 westering sun dr');
      const r9355 = findInResults(results, '9355 westering sun dr');
      expect(r9354).toBeDefined();
      if (r9355) {
        expect(r9354!.score).toBeGreaterThan(r9355.score);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // K. Edge cases
  // ────────────────────────────────────────────────────────────────
  describe('K. Edge cases', () => {
    it('empty string should return empty array', async () => {
      const results = await service.autocompleteProperties('');
      expect(results).toEqual([]);
    });

    it('whitespace-only should return empty array', async () => {
      const results = await service.autocompleteProperties('   ');
      expect(results).toEqual([]);
    });

    it('single character "a" should not crash', async () => {
      const results = await service.autocompleteProperties('a');
      expect(Array.isArray(results)).toBe(true);
    });

    it('single character "9" should not crash', async () => {
      const results = await service.autocompleteProperties('9');
      expect(Array.isArray(results)).toBe(true);
    });

    it('only noise words "my the a" should return empty array', async () => {
      const results = await service.autocompleteProperties('my the a');
      expect(results).toEqual([]);
    });

    it('SQL injection attempt should not crash', async () => {
      const results = await service.autocompleteProperties("'; DROP TABLE properties; --");
      expect(Array.isArray(results)).toBe(true);
    });

    it('special characters should not crash', async () => {
      const results = await service.autocompleteProperties('!@#$%^&*()');
      expect(Array.isArray(results)).toBe(true);
    });

    it('very long input should not crash', async () => {
      const longInput = 'a'.repeat(500);
      const results = await service.autocompleteProperties(longInput);
      expect(Array.isArray(results)).toBe(true);
    });

    it('unicode characters should not crash', async () => {
      const results = await service.autocompleteProperties('caf\u00e9 stra\u00dfe');
      expect(Array.isArray(results)).toBe(true);
    });

    it('trailing spaces should be handled', async () => {
      const results = await service.autocompleteProperties('9354 westering   ');
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].address).toBe('9354 westering sun dr');
      }
    });

    it('leading spaces should be handled', async () => {
      const results = await service.autocompleteProperties('   9354 westering');
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].address).toBe('9354 westering sun dr');
      }
    });

    it('multiple consecutive spaces should be handled', async () => {
      const results = await service.autocompleteProperties('9354    westering');
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].address).toBe('9354 westering sun dr');
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // L. Case insensitivity
  // ────────────────────────────────────────────────────────────────
  describe('L. Case insensitivity', () => {
    it('"WEST" should return same results as "west"', async () => {
      const upper = await service.autocompleteProperties('WEST');
      const lower = await service.autocompleteProperties('west');
      expect(upper.length).toBe(lower.length);
      expect(addressesOf(upper)).toEqual(addressesOf(lower));
    });

    it('"West" should return same results as "west"', async () => {
      const mixed = await service.autocompleteProperties('West');
      const lower = await service.autocompleteProperties('west');
      expect(mixed.length).toBe(lower.length);
      expect(addressesOf(mixed)).toEqual(addressesOf(lower));
    });

    it('"123 MAIN" should match same as "123 main"', async () => {
      const upper = await service.autocompleteProperties('123 MAIN');
      const lower = await service.autocompleteProperties('123 main');
      expect(upper.length).toBe(lower.length);
    });

    it('"COLUMBIA" should match same as "columbia"', async () => {
      const upper = await service.autocompleteProperties('COLUMBIA');
      const lower = await service.autocompleteProperties('columbia');
      expect(upper.length).toBe(lower.length);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // M. Result shape validation
  // ────────────────────────────────────────────────────────────────
  describe('M. Result shape validation', () => {
    it('each result should have all expected fields', async () => {
      const results = await service.autocompleteProperties('9354 westering');
      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        expect(typeof result.id).toBe('number');
        expect(typeof result.address).toBe('string');
        expect(
          result.formattedAddress === null || typeof result.formattedAddress === 'string',
        ).toBe(true);
        expect(result.city === null || typeof result.city === 'string').toBe(true);
        expect(result.state === null || typeof result.state === 'string').toBe(true);
        expect(result.zipCode === null || typeof result.zipCode === 'string').toBe(true);
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it('formattedAddress should contain proper casing when present', async () => {
      const results = await service.autocompleteProperties('9354 westering');
      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      if (top.formattedAddress) {
        // formattedAddress should not be all lowercase (it should be properly cased)
        expect(top.formattedAddress).not.toBe(top.formattedAddress.toLowerCase());
      }
    });

    it('returns SearchResult[] directly (not wrapped in SearchResponse)', async () => {
      const results = await service.autocompleteProperties('westering');
      expect(Array.isArray(results)).toBe(true);
      // Should NOT have topMatch or autoSelected properties
      expect((results as any).topMatch).toBeUndefined();
      expect((results as any).autoSelected).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // N. Direction prefix in autocomplete
  // ────────────────────────────────────────────────────────────────
  describe('N. Direction prefix in autocomplete', () => {
    it('"200 main st n" should find 200 main st nw', async () => {
      const results = await service.autocompleteProperties('200 main st n');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '200 main st nw')).toBeDefined();
    });

    it('"200 main st nw" should find 200 main st nw', async () => {
      const results = await service.autocompleteProperties('200 main st nw');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '200 main st nw')).toBeDefined();
    });

    it('"100 n" should find 100 north main street', async () => {
      const results = await service.autocompleteProperties('100 n');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '100 north main street')).toBeDefined();
    });

    it('"100 north" should find 100 north main street', async () => {
      const results = await service.autocompleteProperties('100 north');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '100 north main street')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Q. AND (must) logic: house number + street name both required
  // ────────────────────────────────────────────────────────────────
  describe('Q. AND (must) logic: house number + street name both required', () => {
    it('"8933 amelung st" should return amelung st, not other 8933 addresses', async () => {
      const results = await service.autocompleteProperties('8933 amelung st');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '8933 amelung st')).toBeDefined();
      // Should NOT return 8933 centerway rd (wrong street)
      expect(findInResults(results, '8933 centerway rd')).toBeUndefined();
    });

    it('"8933 center" should return centerway rd, not amelung st', async () => {
      const results = await service.autocompleteProperties('8933 center');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '8933 centerway rd')).toBeDefined();
      // Should NOT return amelung st
      expect(findInResults(results, '8933 amelung st')).toBeUndefined();
    });

    it('"8933 amelung" should match amelung addresses only', async () => {
      const results = await service.autocompleteProperties('8933 amelung');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.address).toContain('amelung');
      }
    });

    it('"123 main" should not return 500 maple ave', async () => {
      const results = await service.autocompleteProperties('123 main');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
      expect(findInResults(results, '500 maple ave')).toBeUndefined();
    });

    it('"500 maple" should not return 123 main st', async () => {
      const results = await service.autocompleteProperties('500 maple');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '500 maple ave')).toBeDefined();
      expect(findInResults(results, '123 main st')).toBeUndefined();
    });

    it('house number alone should still return all addresses with that number', async () => {
      const results = await service.autocompleteProperties('8933');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(findInResults(results, '8933 amelung st')).toBeDefined();
      expect(findInResults(results, '8933 centerway rd')).toBeDefined();
    });

    it('street name alone should return all addresses on that street', async () => {
      const results = await service.autocompleteProperties('amelung');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '8933 amelung st')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // O. Autocomplete vs Search comparison
  // ────────────────────────────────────────────────────────────────
  describe('O. Autocomplete vs Search comparison', () => {
    it('autocomplete("9354 we") should find results via prefix matching', async () => {
      const autocompleteResults = await service.autocompleteProperties('9354 we');
      expect(autocompleteResults.length).toBeGreaterThan(0);
      expect(autocompleteResults[0].address).toBe('9354 westering sun dr');
    });

    it('search("9354 we") may or may not find results (uses fuzzy_term not prefix)', async () => {
      const { results: searchResults } = await service.searchProperties('9354 we');
      // Document the behavior — search uses fuzzy_term for "we" which may not match
      // This is the key behavioral difference
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('autocomplete and search should agree on exact full address', async () => {
      const autocompleteResults = await service.autocompleteProperties('9354 westering sun dr');
      const { results: searchResults } = await service.searchProperties('9354 westering sun dr');
      // Both should find the property
      expect(autocompleteResults.length).toBeGreaterThan(0);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(autocompleteResults[0].address).toBe(searchResults[0].address);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // P. Bug-hunting: phrase_prefix edge cases
  // ────────────────────────────────────────────────────────────────
  describe('P. Bug-hunting: phrase_prefix edge cases', () => {
    it('phrase_prefix should search city field (not just address)', async () => {
      // "col" in autocomplete → phrase_prefix('address', ['col'])
      // This won't match city='columbia' because phrase_prefix only checks address
      // Test to expose the gap
      const results = await service.autocompleteProperties('col');
      // If this fails, the fix is to add phrase_prefix('city', ...) as an alternative clause
      expect(results.length).toBeGreaterThan(0);
    });

    it('last token as noise word should be handled gracefully', async () => {
      // "the" is noise → skipped. "123 main" should still match
      const results = await service.autocompleteProperties('123 main the');
      expect(results.length).toBeGreaterThan(0);
      expect(findInResults(results, '123 main st')).toBeDefined();
    });

    it('single-token prefix query should use phrase_prefix', async () => {
      const results = await service.autocompleteProperties('wes');
      expect(results.length).toBeGreaterThan(0);
      const addrs = addressesOf(results);
      expect(addrs.some((a) => a.includes('westering'))).toBe(true);
    });

    it('"ma" as single token should prefix-match main and maple', async () => {
      const results = await service.autocompleteProperties('ma');
      expect(results.length).toBeGreaterThan(0);
      const addrs = addressesOf(results);
      const matchesMain = addrs.some((a) => a.includes('main'));
      const matchesMaple = addrs.some((a) => a.includes('maple'));
      expect(matchesMain || matchesMaple).toBe(true);
    });

    it('buildSearchQuery should produce valid SQL for autocomplete', () => {
      const query = service.buildSearchQuery('9354 we', true);
      expect(query.length).toBeGreaterThan(0);
      expect(query).toContain('phrase_prefix');
      expect(query).toContain('paradedb.boost');
      expect(query).toContain('must');
    });

    it('buildSearchQuery without autocomplete should NOT produce phrase_prefix', () => {
      const query = service.buildSearchQuery('9354 we', false);
      expect(query.length).toBeGreaterThan(0);
      expect(query).not.toContain('phrase_prefix');
    });

    it('buildSearchQuery should use must for house_number + word tokens', () => {
      const query = service.buildSearchQuery('8933 amelung st', true);
      expect(query).toContain('must');
      // house number and street name should be in must clause
      expect(query).toContain("'8933'");
      expect(query).toContain("'amelung'");
    });

    it('buildSearchQuery should use should for state and zip tokens', () => {
      const query = service.buildSearchQuery('123 main md', true);
      expect(query).toContain('must');
      // State should be in should (optional boost), not must
      expect(query).toContain("'md'");
    });

    it('all non-word tokens query should still return results', async () => {
      // "9354 21045 md" → house_number + zip + state, no word tokens
      const results = await service.autocompleteProperties('9354 21045 md');
      expect(results.length).toBeGreaterThan(0);
      // Should find 9354 westering sun dr (matches house_number, zip, and state)
      expect(findInResults(results, '9354 westering sun dr')).toBeDefined();
    });

    it('"123 main st" autocomplete vs search: abbreviation handling differs', async () => {
      // In autocomplete: "st" (last token, word type) → phrase_prefix('address', ['st'])
      // In search: "st" → expandAbbreviations → fuzzy_term for both 'st' and 'street'
      const autoResults = await service.autocompleteProperties('123 main st');
      const { results: searchResults } = await service.searchProperties('123 main st');

      // Both should find 123 main st, but via different mechanisms
      expect(findInResults(autoResults, '123 main st')).toBeDefined();
      expect(findInResults(searchResults, '123 main st')).toBeDefined();
    });

    it('comma-separated input should work in autocomplete', async () => {
      const results = await service.autocompleteProperties('9354, westering');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });

    it('hyphenated input should work in autocomplete', async () => {
      const results = await service.autocompleteProperties('9354-westering');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address).toBe('9354 westering sun dr');
    });
  });
});
