import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyDbService } from '../property-db.service';
import { AddressParserService } from '../address-parser.service';

let service: PropertyDbService;
let addressParser: AddressParserService;

beforeEach(() => {
  addressParser = new AddressParserService();
  // Create service with null db — we're only testing query building, not execution
  service = new PropertyDbService(null as any, addressParser);
});

describe('PropertyDbService - buildSearchQuery', () => {
  it('should return empty string for empty input', () => {
    expect(service.buildSearchQuery('')).toBe('');
    expect(service.buildSearchQuery('   ')).toBe('');
  });

  it('should boost house numbers with factor 3.0', () => {
    const query = service.buildSearchQuery('9354');
    expect(query).toContain("boost(3.0, paradedb.term('address', '9354'))");
  });

  it('should boost zip codes with factor 2.0', () => {
    const query = service.buildSearchQuery('21045');
    expect(query).toContain("boost(2.0, paradedb.term('zip_code', '21045'))");
  });

  it('should use exact term match for state codes', () => {
    const query = service.buildSearchQuery('md');
    expect(query).toContain("paradedb.term('state', 'md')");
  });

  it('should use fuzzy_term for regular words', () => {
    const query = service.buildSearchQuery('westering');
    expect(query).toContain("fuzzy_term('address', 'westering', distance => 1)");
  });

  it('should expand abbreviations with OR (boolean should)', () => {
    const query = service.buildSearchQuery('st');
    // 'st' is a 2-letter token — classifyToken sees it as state (state list has no 'st')
    // Actually 'st' is not in the US states set, so it should be classified as 'word'
    // and since it has abbreviation, it should be expanded
    expect(query).toContain("fuzzy_term('address', 'st', distance => 1)");
    expect(query).toContain("fuzzy_term('address', 'street', distance => 1)");
  });

  it('should skip noise words', () => {
    const query = service.buildSearchQuery('my address is 123 main');
    // Noise words should not appear as search terms (but 'address' appears as column name)
    expect(query).not.toContain("term('address', 'my')");
    expect(query).not.toContain("term('address', 'address')");
    expect(query).not.toContain("term('address', 'is')");
    expect(query).toContain("'123'");
    expect(query).toContain("'main'");
  });

  it('should handle full address with number, street, city, state, zip', () => {
    const query = service.buildSearchQuery(
      '9354 westering sun dr columbia md 21045',
    );
    expect(query).toContain("boost(3.0, paradedb.term('address', '9354'))");
    expect(query).toContain("fuzzy_term('address', 'westering'");
    expect(query).toContain("fuzzy_term('address', 'sun'");
    // 'dr' should be expanded with 'drive'
    expect(query).toContain("'dr'");
    expect(query).toContain("'drive'");
    expect(query).toContain("fuzzy_term('city', 'columbia'");
    expect(query).toContain("paradedb.term('state', 'md')");
    expect(query).toContain("boost(2.0, paradedb.term('zip_code', '21045'))");
  });

  it('should use phrase_prefix for last token in autocomplete mode', () => {
    const query = service.buildSearchQuery('9354 we', true);
    expect(query).toContain("phrase_prefix('address', ARRAY['we'])");
  });

  it('should NOT use phrase_prefix in non-autocomplete mode', () => {
    const query = service.buildSearchQuery('9354 we', false);
    expect(query).not.toContain('phrase_prefix');
  });

  it('should handle mixed case input', () => {
    const query = service.buildSearchQuery('9354 WESTERING SUN DR');
    expect(query).toContain("'westering'");
    expect(query).toContain("'sun'");
  });

  it('should handle hyphenated input', () => {
    const query = service.buildSearchQuery('9354-westering-sun-dr');
    expect(query).toContain("'9354'");
    expect(query).toContain("'westering'");
    expect(query).toContain("'sun'");
  });

  it('should handle comma-separated input', () => {
    const query = service.buildSearchQuery('9354, westering sun dr');
    expect(query).toContain("'9354'");
    expect(query).toContain("'westering'");
  });

  it('should wrap everything in boolean(should)', () => {
    const query = service.buildSearchQuery('123 main st');
    expect(query).toMatch(/^paradedb\.boolean\(should => ARRAY\[/);
    expect(query).toMatch(/\]\)$/);
  });

  it('should produce valid SQL without injection for single quotes', () => {
    const query = service.buildSearchQuery("o'brien");
    expect(query).toContain("o''brien");
    expect(query).not.toContain("o'brien'");
  });

  it('should also search city field for words', () => {
    const query = service.buildSearchQuery('columbia');
    expect(query).toContain("fuzzy_term('address', 'columbia'");
    expect(query).toContain("fuzzy_term('city', 'columbia'");
  });
});
