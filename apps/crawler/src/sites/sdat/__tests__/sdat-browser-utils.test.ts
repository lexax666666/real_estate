import { describe, it, expect, beforeEach } from 'vitest';
import { SdatBrowserService } from '../sdat-browser.service';
import { MARYLAND_COUNTIES } from '../sdat.constants';

/**
 * Tests for the pure/static methods of SdatBrowserService.
 * The browser-dependent fetchPropertyHtml method is covered
 * in the separate e2e test file.
 */
describe('SdatBrowserService', () => {
  describe('resolveCountyCode (via instance)', () => {
    let service: SdatBrowserService;

    // resolveCountyCode is private, so we access it via bracket notation.
    // This is acceptable for unit testing private utility logic.

    beforeEach(() => {
      service = new SdatBrowserService();
    });

    it('should pass through a two-digit numeric code "01"', () => {
      const result = (service as any).resolveCountyCode('01');
      expect(result).toBe('01');
    });

    it('should pass through code "24"', () => {
      const result = (service as any).resolveCountyCode('24');
      expect(result).toBe('24');
    });

    it('should resolve county name "FREDERICK" to its code', () => {
      const result = (service as any).resolveCountyCode('FREDERICK');
      expect(result).toBe('11');
    });

    it('should resolve county name case insensitively', () => {
      const result = (service as any).resolveCountyCode('frederick');
      expect(result).toBe('11');
    });

    it('should resolve "MONTGOMERY" to "16"', () => {
      const result = (service as any).resolveCountyCode('MONTGOMERY');
      expect(result).toBe('16');
    });

    it('should resolve "ANNE ARUNDEL" to "02"', () => {
      const result = (service as any).resolveCountyCode('ANNE ARUNDEL');
      expect(result).toBe('02');
    });

    it('should resolve "BALTIMORE CITY" to "03"', () => {
      const result = (service as any).resolveCountyCode('BALTIMORE CITY');
      expect(result).toBe('03');
    });

    it('should resolve "PRINCE GEORGE\'S" to "17"', () => {
      const result = (service as any).resolveCountyCode("PRINCE GEORGE'S");
      expect(result).toBe('17');
    });

    it('should trim whitespace from county name', () => {
      const result = (service as any).resolveCountyCode('  FREDERICK  ');
      expect(result).toBe('11');
    });

    it('should throw for unknown county name', () => {
      expect(() =>
        (service as any).resolveCountyCode('NONEXISTENT'),
      ).toThrowError(/Unknown Maryland county.*NONEXISTENT/);
    });

    it('should throw for empty string', () => {
      expect(() =>
        (service as any).resolveCountyCode(''),
      ).toThrowError(/Unknown Maryland county/);
    });

    it('should resolve all 24 Maryland counties', () => {
      for (const [name, expectedCode] of Object.entries(MARYLAND_COUNTIES)) {
        const result = (service as any).resolveCountyCode(name);
        expect(result).toBe(expectedCode);
      }
    });
  });

  describe('parseAddress (static)', () => {
    it('should parse "8933 AMELUNG ST, FREDERICK, MD 21704"', () => {
      const result = SdatBrowserService.parseAddress(
        '8933 AMELUNG ST, FREDERICK, MD 21704',
        'FREDERICK',
      );

      expect(result).toEqual({
        county: 'FREDERICK',
        streetNumber: '8933',
        streetName: 'AMELUNG',
      });
    });

    it('should parse a simple "123 MAIN ST" address', () => {
      const result = SdatBrowserService.parseAddress(
        '123 MAIN ST',
        'MONTGOMERY',
      );

      expect(result).toEqual({
        county: 'MONTGOMERY',
        streetNumber: '123',
        streetName: 'MAIN',
      });
    });

    it('should handle address with only a street number', () => {
      const result = SdatBrowserService.parseAddress('100', 'HOWARD');

      expect(result).toEqual({
        county: 'HOWARD',
        streetNumber: '100',
        streetName: '',
      });
    });

    it('should handle empty address', () => {
      const result = SdatBrowserService.parseAddress('', 'FREDERICK');

      expect(result).toEqual({
        county: 'FREDERICK',
        streetNumber: '',
        streetName: '',
      });
    });

    it('should use the county parameter as-is', () => {
      const result = SdatBrowserService.parseAddress(
        '456 OAK AVE',
        'ANNE ARUNDEL',
      );

      expect(result.county).toBe('ANNE ARUNDEL');
    });

    it('should take only the first token as streetNumber', () => {
      const result = SdatBrowserService.parseAddress(
        '100 N MAIN ST, ROCKVILLE, MD 20850',
        'MONTGOMERY',
      );

      expect(result.streetNumber).toBe('100');
      expect(result.streetName).toBe('N');
    });

    it('should split on both commas and whitespace', () => {
      const result = SdatBrowserService.parseAddress(
        '200 COLLEGE PKWY, ARNOLD, MD 21012',
        'ANNE ARUNDEL',
      );

      expect(result.streetNumber).toBe('200');
      expect(result.streetName).toBe('COLLEGE');
    });
  });
});
