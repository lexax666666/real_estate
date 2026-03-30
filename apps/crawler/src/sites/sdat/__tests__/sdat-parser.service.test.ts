import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SdatParserService } from '../sdat-parser.service';

describe('SdatParserService', () => {
  let parser: SdatParserService;
  let fixtureHtml: string;

  beforeAll(() => {
    parser = new SdatParserService();
    fixtureHtml = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'sdat-result-sample.html'),
      'utf-8',
    );
  });

  describe('parsePropertyPage', () => {
    it('should parse owner names', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.ownerNames).toEqual(['CHEN KEQIANG', 'WANG HONGDI']);
    });

    it('should parse property use', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.propertyUse).toBe('TOWN HOUSE');
    });

    it('should parse principal residence', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.principalResidence).toBe(true);
    });

    it('should parse mailing address', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.mailingAddress).toContain('8933 AMELUNG ST');
      expect(result.mailingAddress).toContain('FREDERICK');
    });

    it('should parse deed reference', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.deedReference).toBe('/11593/ 00095');
    });

    it('should parse account identifier', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.accountId).toBe('07-247192');
      expect(result.district).toBe('07');
    });

    it('should parse premises address', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.premisesAddress).toContain('AMELUNG');
      expect(result.premisesAddress).toContain('FREDERICK');
    });

    it('should parse legal description', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.legalDescription).toContain('LOT 1287');
      expect(result.legalDescription).toContain('VILLAGES OF URBANA');
    });

    it('should parse map, grid, parcel', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.map).toBe('0096');
      expect(result.grid).toBe('0009');
      expect(result.parcel).toBe('0249');
    });

    it('should parse neighborhood and subdivision', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.neighborhood).toBe('7030030.11');
      expect(result.subdivisionCode).toBe('0000');
    });

    it('should parse section, block, lot', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.section).toBe('M1B');
      expect(result.block).toBe('');
      expect(result.lot).toBe('1287');
    });

    it('should parse year built', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.yearBuilt).toBe(2008);
    });

    it('should parse above grade living area', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.aboveGradeLivingArea).toBe(1868);
    });

    it('should parse finished basement area as null when empty', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.finishedBasementArea).toBeNull();
    });

    it('should parse land area', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.landArea).toBe('1,592 SF');
    });

    it('should parse stories', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.stories).toBe(3);
    });

    it('should parse basement as false', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.basement).toBe(false);
    });

    it('should parse structure type', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.structureType).toBe('END UNIT');
    });

    it('should parse exterior', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.exterior).toBe('BRICK');
    });

    it('should parse quality', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.quality).toBe('5');
    });

    it('should parse full and half baths', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.fullBaths).toBe(2);
      expect(result.halfBaths).toBe(2);
    });

    it('should parse garage', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.garageSpaces).toBe(1);
      expect(result.garageType).toBe('Attached');
    });

    it('should parse base values', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.baseValue).toEqual({
        land: 135000,
        improvements: 299400,
        total: 434400,
      });
    });

    it('should parse current values', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.currentValue).toEqual({
        land: 170000,
        improvements: 385300,
        total: 555300,
      });
    });

    it('should parse phase-in assessments', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.phaseInAssessments).toHaveLength(2);
      expect(result.phaseInAssessments[0]).toEqual({
        date: '07/01/2025',
        land: 0,
        improvements: 0,
        total: 474700,
      });
      expect(result.phaseInAssessments[1]).toEqual({
        date: '07/01/2026',
        land: 0,
        improvements: 0,
        total: 515000,
      });
    });

    it('should parse transfer history', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.transfers).toHaveLength(2);

      expect(result.transfers[0]).toEqual({
        seller: 'KONAI  KELLY L',
        date: '01/04/2017',
        price: 333000,
        type: 'ARMS LENGTH IMPROVED',
        deedRef1: '/11593/ 00095',
        deedRef2: '',
      });

      expect(result.transfers[1]).toEqual({
        seller: 'MONOCACY LAND COMPANY, LLC.',
        date: '04/17/2008',
        price: 329090,
        type: 'ARMS LENGTH IMPROVED',
        deedRef1: '/06953/ 00083',
        deedRef2: '',
      });
    });

    it('should parse exemptions', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.exemptions).toEqual({ partialExempt: 'None' });
    });

    it('should parse homestead status', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.homesteadStatus).toBe('Approved');
    });

    it('should parse homestead application date', () => {
      const result = parser.parsePropertyPage(fixtureHtml);
      expect(result.homesteadApplicationDate).toBe('09/18/2017');
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML gracefully', () => {
      const result = parser.parsePropertyPage('<div></div>');
      expect(result.ownerNames).toEqual([]);
      expect(result.yearBuilt).toBeNull();
      expect(result.baseValue).toEqual({ land: 0, improvements: 0, total: 0 });
      expect(result.transfers).toEqual([]);
    });

    it('should handle HTML with no results table', () => {
      const result = parser.parsePropertyPage(
        '<html><body>No results</body></html>',
      );
      expect(result.ownerNames).toEqual([]);
      expect(result.premisesAddress).toBe('');
    });
  });
});
