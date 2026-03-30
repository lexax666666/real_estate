import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SdatPropertyResult } from './sdat.types';

const PREFIX =
  'cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucDetailsSearch_dlstDetaisSearch_';

@Injectable()
export class SdatParserService {
  parsePropertyPage(html: string): SdatPropertyResult {
    const $ = cheerio.load(html);

    const span = (suffix: string): string => {
      const el = $(`#${PREFIX}${suffix}`);
      return el.text().trim();
    };

    // Owner info
    const ownerName1 = span('lblOwnerName_0');
    const ownerName2 = span('lblOwnerName2_0');
    const ownerNames = [ownerName1, ownerName2].filter(Boolean);

    const mailingAddress = span('lblMailingAddress_0');

    // Account identifier: "District - 07 Account Identifier - 247192"
    const headerText = span('lblDetailsStreetHeader_0');
    const districtMatch = headerText.match(/District\s*-\s*(\S+)/);
    const accountMatch = headerText.match(/Account Identifier\s*-\s*(\S+)/);
    const district = districtMatch?.[1] || '';
    const accountNumber = accountMatch?.[1] || '';
    const accountId =
      district && accountNumber ? `${district}-${accountNumber}` : '';

    // Premises address
    const premisesAddress = span('lblPremisesAddress_0');

    // Baths: "2 full/ 2 half"
    const bathText = span('Label34_0');
    const { fullBaths, halfBaths } = this.parseBaths(bathText);

    // Garage: "1 Attached"
    const garageText = span('Label35_0');
    const { garageSpaces, garageType } = this.parseGarage(garageText);

    // Phase-in assessments
    const phaseInAssessments = this.parsePhaseInAssessments($);

    // Transfers
    const transfers = this.parseTransfers($);

    // Homestead: "Approved   09/18/2017"
    const homeRaw = span('lblHomeStatus_0');
    const { homesteadStatus, homesteadApplicationDate } =
      this.parseHomestead(homeRaw);

    return {
      // Owner
      ownerNames,
      mailingAddress,
      deedReference: span('lblDedRef_0'),
      principalResidence: span('lblPrinResidence_0').toUpperCase() === 'YES',
      propertyUse: span('lblUse_0'),

      // Location
      premisesAddress,
      accountId,
      district,
      legalDescription: span('lblLegalDescription_0'),
      map: span('Label5_0'),
      grid: span('Label6_0'),
      parcel: span('Label7_0'),
      neighborhood: span('Label8_0'),
      subdivisionCode: span('Label9_0'),
      section: span('Label10_0'),
      block: span('Label11_0'),
      lot: span('Label12_0'),

      // Structure
      yearBuilt: this.parseIntValue(span('Label18_0')),
      aboveGradeLivingArea: this.parseIntValue(span('Label19_0')),
      finishedBasementArea: this.parseIntValue(span('Label27_0')),
      landArea: span('Label20_0') || '',
      stories: this.parseIntValue(span('Label22_0')),
      basement: span('Label23_0').toUpperCase() === 'YES',
      structureType: span('Label24_0'),
      exterior: span('Label25_0'),
      quality: span('lblQuality_0'),
      fullBaths,
      halfBaths,
      garageType,
      garageSpaces,

      // Values
      baseValue: {
        land: this.parseMoneyValue(span('lblBaseLand_0')),
        improvements: this.parseMoneyValue(span('lblBaseImprove_0')),
        total: this.parseMoneyValue(span('lblBaseTotal_0')),
      },
      currentValue: {
        land: this.parseMoneyValue(span('lblBaseLandNow_0')),
        improvements: this.parseMoneyValue(span('lblBaseImproveNow_0')),
        total: this.parseMoneyValue(span('lblBaseTotalNow_0')),
      },
      phaseInAssessments,

      // Transfers
      transfers,

      // Exemptions
      exemptions: {
        partialExempt: span('lblTaxLib_0') || '',
      },
      homesteadStatus,
      homesteadApplicationDate,
    };
  }

  private parseMoneyValue(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/[$,\s]/g, '');
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  }

  private parseIntValue(text: string): number | null {
    if (!text) return null;
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) return null;
    const val = parseInt(digits, 10);
    return isNaN(val) ? null : val;
  }

  private parseBaths(text: string): {
    fullBaths: number | null;
    halfBaths: number | null;
  } {
    if (!text) return { fullBaths: null, halfBaths: null };
    const fullMatch = text.match(/(\d+)\s*full/i);
    const halfMatch = text.match(/(\d+)\s*half/i);
    return {
      fullBaths: fullMatch ? parseInt(fullMatch[1], 10) : null,
      halfBaths: halfMatch ? parseInt(halfMatch[1], 10) : null,
    };
  }

  private parseGarage(text: string): {
    garageSpaces: number | null;
    garageType: string;
  } {
    if (!text) return { garageSpaces: null, garageType: '' };
    const match = text.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        garageSpaces: parseInt(match[1], 10),
        garageType: match[2].trim(),
      };
    }
    return { garageSpaces: null, garageType: text };
  }

  private parseHomestead(raw: string): {
    homesteadStatus: string;
    homesteadApplicationDate: string;
  } {
    if (!raw) return { homesteadStatus: '', homesteadApplicationDate: '' };
    const dateMatch = raw.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch?.[1] || '';
    const status = raw.replace(/\d{2}\/\d{2}\/\d{4}/, '').trim();
    return { homesteadStatus: status, homesteadApplicationDate: date };
  }

  private parsePhaseInAssessments(
    $: cheerio.CheerioAPI,
  ): SdatPropertyResult['phaseInAssessments'] {
    const assessments: SdatPropertyResult['phaseInAssessments'] = [];

    const span = (suffix: string): string =>
      $(`#${PREFIX}${suffix}`).text().trim();

    // Phase-in 1: date from lblPhaseDate_0 "As of 07/01/2025", total from lblPhaseInTotal_0
    const phaseDate1Raw = span('lblPhaseDate_0');
    const phaseDate1 =
      phaseDate1Raw.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || '';
    const phaseTotal1 = this.parseMoneyValue(span('lblPhaseInTotal_0'));

    // Phase-in 2: date from lblAssesDate_0 "As of 07/01/2026", total from lblAssesTotal_0
    const phaseDate2Raw = span('lblAssesDate_0');
    const phaseDate2 =
      phaseDate2Raw.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || '';
    const phaseTotal2 = this.parseMoneyValue(span('lblAssesTotal_0'));

    if (phaseTotal1 > 0) {
      assessments.push({
        date: phaseDate1,
        land: 0,
        improvements: 0,
        total: phaseTotal1,
      });
    }

    if (phaseTotal2 > 0) {
      assessments.push({
        date: phaseDate2,
        land: 0,
        improvements: 0,
        total: phaseTotal2,
      });
    }

    return assessments;
  }

  private parseTransfers(
    $: cheerio.CheerioAPI,
  ): SdatPropertyResult['transfers'] {
    const transfers: SdatPropertyResult['transfers'] = [];

    const span = (suffix: string): string =>
      $(`#${PREFIX}${suffix}`).text().trim();

    // Transfer 1: Labels 38-43
    // Transfer 2: Labels 44-49
    // Transfer 3: Labels 50-55
    const offsets = [
      { seller: 38, date: 39, price: 40, type: 41, deed1: 42, deed2: 43 },
      { seller: 44, date: 45, price: 46, type: 47, deed1: 48, deed2: 49 },
      { seller: 50, date: 51, price: 52, type: 53, deed1: 54, deed2: 55 },
    ];

    for (const o of offsets) {
      const seller = span(`Label${o.seller}_0`);
      const date = span(`Label${o.date}_0`);
      const price = this.parseMoneyValue(span(`Label${o.price}_0`));
      const type = span(`Label${o.type}_0`);
      const deedRef1 = span(`Label${o.deed1}_0`);
      const deedRef2 = span(`Label${o.deed2}_0`);

      if (seller || date) {
        transfers.push({ seller, date, price, type, deedRef1, deedRef2 });
      }
    }

    return transfers;
  }
}
