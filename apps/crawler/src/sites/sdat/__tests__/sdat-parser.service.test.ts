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

  describe('parsePropertyPage — Montgomery County fixture', () => {
    let montgomeryHtml: string;

    beforeAll(() => {
      montgomeryHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'sdat-result-montgomery.html'),
        'utf-8',
      );
    });

    it('should parse single owner name (government entity)', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.ownerNames).toEqual(['MONTGOMERY CO']);
    });

    it('should parse property use as EXEMPT COMMERCIAL', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.propertyUse).toBe('EXEMPT COMMERCIAL');
    });

    it('should parse principal residence as false', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.principalResidence).toBe(false);
    });

    it('should parse mailing address', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.mailingAddress).toContain('ROCKVILLE');
    });

    it('should parse deed reference', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.deedReference).toBe('/01398/ 00017');
    });

    it('should parse account identifier', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.accountId).toBe('04-00152444');
      expect(result.district).toBe('04');
    });

    it('should parse premises address', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.premisesAddress).toContain('MARYLAND AVE');
      expect(result.premisesAddress).toContain('ROCKVILLE');
    });

    it('should parse legal description', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.legalDescription).toContain('OLD JAIL');
    });

    it('should parse map, grid, parcel', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.map).toBe('GR32');
      expect(result.grid).toBe('0000');
      expect(result.parcel).toBe('P502');
    });

    it('should parse neighborhood and subdivision', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.neighborhood).toBe('30004.16');
      expect(result.subdivisionCode).toBe('0201');
    });

    it('should parse section, block, lot as empty', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.section).toBe('');
      expect(result.block).toBe('');
      expect(result.lot).toBe('');
    });

    it('should parse yearBuilt as null for government building', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.yearBuilt).toBeNull();
    });

    it('should parse above grade living area', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.aboveGradeLivingArea).toBe(135424);
    });

    it('should parse land area in square feet', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.landArea).toBe('42,966 SF');
    });

    it('should parse stories as null', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.stories).toBeNull();
    });

    it('should parse structure type as GOVERNMENT BUILDING', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.structureType).toBe('GOVERNMENT BUILDING');
    });

    it('should parse exterior as empty', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.exterior).toBe('');
    });

    it('should parse quality', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.quality).toBe('C4');
    });

    it('should parse baths as null for non-residential', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.fullBaths).toBeNull();
      expect(result.halfBaths).toBeNull();
    });

    it('should parse garage as empty for non-residential', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.garageSpaces).toBeNull();
      expect(result.garageType).toBe('');
    });

    it('should parse base values (high-value commercial)', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.baseValue).toEqual({
        land: 1660200,
        improvements: 24614900,
        total: 26275100,
      });
    });

    it('should parse current values', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.currentValue).toEqual({
        land: 1826000,
        improvements: 26136600,
        total: 27962600,
      });
    });

    it('should parse phase-in assessments', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.phaseInAssessments).toHaveLength(2);
      expect(result.phaseInAssessments[0]).toEqual({
        date: '07/01/2025',
        land: 0,
        improvements: 0,
        total: 27400100,
      });
      expect(result.phaseInAssessments[1]).toEqual({
        date: '07/01/2026',
        land: 0,
        improvements: 0,
        total: 27962600,
      });
    });

    it('should parse empty transfer history', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.transfers).toHaveLength(0);
    });

    it('should parse homestead as No Application', () => {
      const result = parser.parsePropertyPage(montgomeryHtml);
      expect(result.homesteadStatus).toBe('No Application');
      expect(result.homesteadApplicationDate).toBe('');
    });
  });

  describe('parsePropertyPage — Anne Arundel County fixture', () => {
    let anneArundelHtml: string;

    beforeAll(() => {
      anneArundelHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'sdat-result-anne-arundel.html'),
        'utf-8',
      );
    });

    it('should parse single owner name (institution)', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.ownerNames).toEqual(['ANNE ARUNDEL COMMUNITY COLLEGE']);
    });

    it('should parse property use as EXEMPT COMMERCIAL', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.propertyUse).toBe('EXEMPT COMMERCIAL');
    });

    it('should parse principal residence as false', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.principalResidence).toBe(false);
    });

    it('should parse mailing address', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.mailingAddress).toContain('COLLEGE');
      expect(result.mailingAddress).toContain('ARNOLD');
    });

    it('should parse deed reference', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.deedReference).toBe('/01856/ 00471');
    });

    it('should parse account identifier', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.accountId).toBe('03-90039170');
      expect(result.district).toBe('03');
    });

    it('should parse premises address', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.premisesAddress).toContain('COLLEGE PKWY');
      expect(result.premisesAddress).toContain('ARNOLD');
    });

    it('should parse legal description', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.legalDescription).toContain('169.00ACS');
      expect(result.legalDescription).toContain('RUBERT MANOR');
    });

    it('should parse map, grid, parcel', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.map).toBe('0032');
      expect(result.grid).toBe('0023');
      expect(result.parcel).toBe('0371');
    });

    it('should parse neighborhood and subdivision', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.neighborhood).toBe('13000.02');
      expect(result.subdivisionCode).toBe('000');
    });

    it('should parse section, block, lot', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.section).toBe('A');
      expect(result.block).toBe('');
      expect(result.lot).toBe('');
    });

    it('should parse year built', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.yearBuilt).toBe(2021);
    });

    it('should parse above grade living area', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.aboveGradeLivingArea).toBe(301324);
    });

    it('should parse land area in acres', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.landArea).toBe('169.0000 AC');
    });

    it('should parse stories as null', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.stories).toBeNull();
    });

    it('should parse structure type as MULTI-PURPOSE SCHOOL BUILDING', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.structureType).toBe('MULTI-PURPOSE SCHOOL BUILDING');
    });

    it('should parse exterior as BRICK', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.exterior).toBe('BRICK');
    });

    it('should parse quality', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.quality).toBe('C4');
    });

    it('should parse baths as null for non-residential', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.fullBaths).toBeNull();
      expect(result.halfBaths).toBeNull();
    });

    it('should parse garage as empty for non-residential', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.garageSpaces).toBeNull();
      expect(result.garageType).toBe('');
    });

    it('should parse base values (high-value institutional)', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.baseValue).toEqual({
        land: 22873700,
        improvements: 85520500,
        total: 108394200,
      });
    });

    it('should parse current values', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.currentValue).toEqual({
        land: 22873700,
        improvements: 99165500,
        total: 122039200,
      });
    });

    it('should parse phase-in assessments', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.phaseInAssessments).toHaveLength(2);
      expect(result.phaseInAssessments[0]).toEqual({
        date: '07/01/2025',
        land: 0,
        improvements: 0,
        total: 112942533,
      });
      expect(result.phaseInAssessments[1]).toEqual({
        date: '07/01/2026',
        land: 0,
        improvements: 0,
        total: 117490867,
      });
    });

    it('should parse transfer with empty seller and zero price', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]).toEqual({
        seller: '',
        date: '05/18/1983',
        price: 0,
        type: 'NON-ARMS LENGTH OTHER',
        deedRef1: '/01856/ 00471',
        deedRef2: '',
      });
    });

    it('should parse homestead as No Application', () => {
      const result = parser.parsePropertyPage(anneArundelHtml);
      expect(result.homesteadStatus).toBe('No Application');
      expect(result.homesteadApplicationDate).toBe('');
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
