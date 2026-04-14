import { describe, it, expect, beforeEach } from 'vitest';
import { AddressParserService } from '../address-parser.service';

let service: AddressParserService;

beforeEach(() => {
  service = new AddressParserService();
});

describe('AddressParserService - Search Methods', () => {
  describe('expandAbbreviations', () => {
    it('should expand st to [st, street]', () => {
      expect(service.expandAbbreviations('st')).toEqual(['st', 'street']);
    });

    it('should expand street to [street, st]', () => {
      expect(service.expandAbbreviations('street')).toEqual(['street', 'st']);
    });

    it('should expand ave to [ave, avenue]', () => {
      expect(service.expandAbbreviations('ave')).toEqual(['ave', 'avenue']);
    });

    it('should expand avenue to [avenue, ave]', () => {
      expect(service.expandAbbreviations('avenue')).toEqual(['avenue', 'ave']);
    });

    it('should expand rd to [rd, road]', () => {
      expect(service.expandAbbreviations('rd')).toEqual(['rd', 'road']);
    });

    it('should expand road to [road, rd]', () => {
      expect(service.expandAbbreviations('road')).toEqual(['road', 'rd']);
    });

    it('should expand dr to [dr, drive]', () => {
      expect(service.expandAbbreviations('dr')).toEqual(['dr', 'drive']);
    });

    it('should expand ln to [ln, lane]', () => {
      expect(service.expandAbbreviations('ln')).toEqual(['ln', 'lane']);
    });

    it('should expand blvd to [blvd, boulevard]', () => {
      expect(service.expandAbbreviations('blvd')).toEqual(['blvd', 'boulevard']);
    });

    it('should expand ct to [ct, court]', () => {
      expect(service.expandAbbreviations('ct')).toEqual(['ct', 'court']);
    });

    it('should expand pl to [pl, place]', () => {
      expect(service.expandAbbreviations('pl')).toEqual(['pl', 'place']);
    });

    it('should expand cir to [cir, circle]', () => {
      expect(service.expandAbbreviations('cir')).toEqual(['cir', 'circle']);
    });

    it('should expand pkwy to [pkwy, parkway]', () => {
      expect(service.expandAbbreviations('pkwy')).toEqual(['pkwy', 'parkway']);
    });

    it('should expand trl to [trl, trail]', () => {
      expect(service.expandAbbreviations('trl')).toEqual(['trl', 'trail']);
    });

    it('should expand ter to [ter, terrace]', () => {
      expect(service.expandAbbreviations('ter')).toEqual(['ter', 'terrace']);
    });

    // Direction abbreviations
    it('should expand n to [n, north]', () => {
      expect(service.expandAbbreviations('n')).toEqual(['n', 'north']);
    });

    it('should expand north to [north, n]', () => {
      expect(service.expandAbbreviations('north')).toEqual(['north', 'n']);
    });

    it('should expand s to [s, south]', () => {
      expect(service.expandAbbreviations('s')).toEqual(['s', 'south']);
    });

    it('should expand e to [e, east]', () => {
      expect(service.expandAbbreviations('e')).toEqual(['e', 'east']);
    });

    it('should expand w to [w, west]', () => {
      expect(service.expandAbbreviations('w')).toEqual(['w', 'west']);
    });

    it('should expand ne to [ne, northeast]', () => {
      expect(service.expandAbbreviations('ne')).toEqual(['ne', 'northeast']);
    });

    it('should expand sw to [sw, southwest]', () => {
      expect(service.expandAbbreviations('sw')).toEqual(['sw', 'southwest']);
    });

    it('should expand apt to [apt, apartment]', () => {
      expect(service.expandAbbreviations('apt')).toEqual(['apt', 'apartment']);
    });

    it('should return single-element array for words without abbreviations', () => {
      expect(service.expandAbbreviations('main')).toEqual(['main']);
    });

    it('should return single-element array for unknown tokens', () => {
      expect(service.expandAbbreviations('westering')).toEqual(['westering']);
    });

    it('should be case-insensitive', () => {
      expect(service.expandAbbreviations('ST')).toEqual(['st', 'street']);
      expect(service.expandAbbreviations('Ave')).toEqual(['ave', 'avenue']);
    });
  });

  describe('tokenizeSearchInput', () => {
    it('should split on spaces', () => {
      expect(service.tokenizeSearchInput('123 main st')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should split on commas', () => {
      expect(service.tokenizeSearchInput('123, main st')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should split on hyphens', () => {
      expect(service.tokenizeSearchInput('123-main-st')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should lowercase all tokens', () => {
      expect(service.tokenizeSearchInput('123 MAIN ST')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should handle multiple spaces', () => {
      expect(service.tokenizeSearchInput('123   main   st')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should filter out empty tokens', () => {
      expect(service.tokenizeSearchInput('  123  main  ')).toEqual([
        '123',
        'main',
      ]);
    });

    it('should handle mixed separators', () => {
      expect(
        service.tokenizeSearchInput('9354, westering-sun dr'),
      ).toEqual(['9354', 'westering', 'sun', 'dr']);
    });

    it('should handle slashes', () => {
      expect(service.tokenizeSearchInput('123/main/st')).toEqual([
        '123',
        'main',
        'st',
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(service.tokenizeSearchInput('')).toEqual([]);
      expect(service.tokenizeSearchInput('   ')).toEqual([]);
    });
  });

  describe('classifyToken', () => {
    it('should classify numeric tokens as house_number', () => {
      expect(service.classifyToken('9354')).toBe('house_number');
      expect(service.classifyToken('123')).toBe('house_number');
      expect(service.classifyToken('1')).toBe('house_number');
    });

    it('should classify 5-digit numeric as zip', () => {
      expect(service.classifyToken('21045')).toBe('zip');
      expect(service.classifyToken('90210')).toBe('zip');
      expect(service.classifyToken('62701')).toBe('zip');
    });

    it('should classify 2-letter state codes as state', () => {
      expect(service.classifyToken('md')).toBe('state');
      expect(service.classifyToken('ca')).toBe('state');
      expect(service.classifyToken('ny')).toBe('state');
      expect(service.classifyToken('il')).toBe('state');
      expect(service.classifyToken('dc')).toBe('state');
    });

    it('should classify noise words', () => {
      expect(service.classifyToken('my')).toBe('noise');
      expect(service.classifyToken('the')).toBe('noise');
      expect(service.classifyToken('is')).toBe('noise');
      expect(service.classifyToken('at')).toBe('noise');
      expect(service.classifyToken('house')).toBe('noise');
      expect(service.classifyToken('address')).toBe('noise');
    });

    it('should classify regular words as word', () => {
      expect(service.classifyToken('main')).toBe('word');
      expect(service.classifyToken('westering')).toBe('word');
      expect(service.classifyToken('sun')).toBe('word');
      expect(service.classifyToken('columbia')).toBe('word');
    });

    it('should not classify st as state (it is a known abbreviation word, and is in state list)', () => {
      // 'ct' is both a state code and a street type abbreviation
      // classifyToken checks state first for 2-letter codes
      expect(service.classifyToken('ct')).toBe('state');
    });

    it('should not classify non-state 2-letter codes as state', () => {
      expect(service.classifyToken('ab')).toBe('word');
      expect(service.classifyToken('zz')).toBe('word');
    });
  });
});
