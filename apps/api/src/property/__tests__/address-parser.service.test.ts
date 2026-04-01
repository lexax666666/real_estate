import { describe, it, expect, beforeEach } from 'vitest';
import { AddressParserService } from '../address-parser.service';

let service: AddressParserService;

beforeEach(() => {
  service = new AddressParserService();
});

describe('AddressParserService', () => {
  describe('parseAddress', () => {
    it('should parse a full address with city, state, and zip', () => {
      const result = service.parseAddress('123 Main St Columbia MD 21045');
      expect(result.streetAddress).toBe('123 main st');
      expect(result.city).toBe('columbia');
      expect(result.state).toBe('md');
      expect(result.zip).toBe('21045');
    });

    it('should parse a street-only address', () => {
      const result = service.parseAddress('123 Main St');
      expect(result.streetAddress).toBe('123 main st');
      expect(result.city).toBeNull();
      expect(result.state).toBeNull();
      expect(result.zip).toBeNull();
    });

    it('should handle the maxwell ln exception — suffix "N" + city "east" → city "north east"', () => {
      const result = service.parseAddress('0 maxwell ln north east md 21901');
      expect(result.streetAddress).toBe('0 maxwell ln');
      expect(result.city).toBe('north east');
      expect(result.state).toBe('md');
      expect(result.zip).toBe('21901');
    });

    it('should handle comma-separated maxwell ln — parse-address gets it right natively', () => {
      const result = service.parseAddress('0 maxwell ln, north east, md 21901');
      expect(result.streetAddress).toBe('0 maxwell ln');
      expect(result.city).toBe('north east');
      expect(result.state).toBe('md');
      expect(result.zip).toBe('21901');
    });

    it('should include direction suffix in streetAddress', () => {
      const result = service.parseAddress('1 2nd ave s');
      expect(result.streetAddress).toBe('1 2nd ave s');
    });

    it('should handle lowercase input', () => {
      const result = service.parseAddress('456 OAK AVE BALTIMORE MD 21201');
      expect(result.streetAddress).toBe('456 oak ave');
      expect(result.city).toBe('baltimore');
      expect(result.state).toBe('md');
    });

    it('should handle address with direction prefix', () => {
      const result = service.parseAddress('100 N Main St Springfield IL 62701');
      expect(result.streetAddress).toBe('100 n main st');
      expect(result.city).toBe('springfield');
      expect(result.state).toBe('il');
      expect(result.zip).toBe('62701');
    });

    it('should handle address without zip code', () => {
      const result = service.parseAddress('789 Elm Blvd Portland OR');
      expect(result.streetAddress).toBe('789 elm blvd');
      expect(result.city).toBe('portland');
      expect(result.state).toBe('or');
      expect(result.zip).toBeNull();
    });

    it('should trim whitespace', () => {
      const result = service.parseAddress('  123 Main St  ');
      expect(result.streetAddress).toBe('123 main st');
    });

    it('should include suffix in both streetAddress and fullAddress', () => {
      const result = service.parseAddress('200 Main St NW Washington DC 20001');
      expect(result.streetAddress).toBe('200 main st nw');
      expect(result.fullAddress).toContain('200 main st nw');
      expect(result.fullAddress).toContain('washington');
      expect(result.fullAddress).toContain('dc');
      expect(result.fullAddress).toContain('20001');
    });

    it('should return street as fullAddress when no city/state/zip', () => {
      const result = service.parseAddress('123 Main St');
      expect(result.fullAddress).toBe('123 main st');
    });

    it('should produce consistent street for both street-only and full address input', () => {
      const streetOnly = service.parseAddress('0 maxwell ln');
      const full = service.parseAddress('0 maxwell ln north east md 21901');
      expect(streetOnly.streetAddress).toBe(full.streetAddress);
    });
  });
});
