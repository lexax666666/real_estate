import { describe, it, expect } from 'vitest';
import { parseAddress, AddressComponents } from '../address-parser.util';

describe('parseAddress', () => {
  describe('full address with commas', () => {
    it('should parse "123 Main St, City, MD 21045"', () => {
      const result = parseAddress('123 Main St, City, MD 21045');

      expect(result).toEqual({
        streetNumber: '123',
        streetName: 'Main St',
        city: 'City',
        state: 'MD',
        zipCode: '21045',
      });
    });

    it('should parse address with zip+4 extension', () => {
      const result = parseAddress(
        '8933 AMELUNG ST, FREDERICK, MD 21704-7918',
      );

      expect(result).toEqual({
        streetNumber: '8933',
        streetName: 'AMELUNG ST',
        city: 'FREDERICK',
        state: 'MD',
        zipCode: '21704-7918',
      });
    });

    it('should parse address with lowercase state', () => {
      const result = parseAddress('100 Oak Ave, Rockville, md 20850');

      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('20850');
    });

    it('should parse multi-word city', () => {
      const result = parseAddress(
        '500 Main St, New York, NY 10001',
      );

      expect(result.city).toBe('New York');
      expect(result.state).toBe('NY');
      expect(result.zipCode).toBe('10001');
    });

    it('should parse multi-word street name', () => {
      const result = parseAddress(
        '200 College Parkway, Arnold, MD 21012',
      );

      expect(result.streetNumber).toBe('200');
      expect(result.streetName).toBe('College Parkway');
      expect(result.city).toBe('Arnold');
      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('21012');
    });
  });

  describe('address without ZIP', () => {
    it('should parse address with state but no zip', () => {
      const result = parseAddress('123 Main St, City, MD');

      expect(result.streetNumber).toBe('123');
      expect(result.streetName).toBe('Main St');
      expect(result.city).toBe('City');
      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('');
    });
  });

  describe('address with only street', () => {
    it('should parse street-only address', () => {
      const result = parseAddress('123 Main St');

      expect(result.streetNumber).toBe('123');
      expect(result.streetName).toBe('Main St');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.zipCode).toBe('');
    });
  });

  describe('address with street and city (two parts)', () => {
    it('should parse two-part address', () => {
      const result = parseAddress('123 Main St, Frederick');

      expect(result.streetNumber).toBe('123');
      expect(result.streetName).toBe('Main St');
      expect(result.city).toBe('Frederick');
      expect(result.state).toBe('');
      expect(result.zipCode).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parseAddress('');

      expect(result.streetNumber).toBe('');
      expect(result.streetName).toBe('');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.zipCode).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const result = parseAddress('   ');

      expect(result.streetNumber).toBe('');
      expect(result.streetName).toBe('');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = parseAddress(
        '  123 Main St, City, MD 21045  ',
      );

      expect(result.streetNumber).toBe('123');
      expect(result.streetName).toBe('Main St');
      expect(result.city).toBe('City');
      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('21045');
    });

    it('should handle address with extra spaces between parts', () => {
      const result = parseAddress('123  Main  St,  City,  MD  21045');

      expect(result.streetNumber).toBe('123');
      // The street part is split on \s+ then re-joined with single space
      expect(result.streetName).toBe('Main St');
      expect(result.city).toBe('City');
      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('21045');
    });

    it('should return the result matching AddressComponents interface', () => {
      const result = parseAddress('123 Main St, City, MD 21045');

      const keys = Object.keys(result);
      expect(keys).toContain('streetNumber');
      expect(keys).toContain('streetName');
      expect(keys).toContain('city');
      expect(keys).toContain('state');
      expect(keys).toContain('zipCode');
    });

    it('should handle address with number-only street', () => {
      const result = parseAddress('100, City, MD 21045');

      expect(result.streetNumber).toBe('100');
      expect(result.streetName).toBe('');
      expect(result.city).toBe('City');
      expect(result.state).toBe('MD');
    });
  });
});
