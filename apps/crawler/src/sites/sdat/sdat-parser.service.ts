import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SdatPropertyResult } from './sdat.types';

const PREFIX =
  'MainContent_MainContent_cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucDetailsSearch_dlstDetaisSearch_';

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

    const mailAddr1 = span('lblMailingAddress_0');
    const mailAddr2 = span('lblMailingAddress2_0');
    const mailingAddress = [mailAddr1, mailAddr2].filter(Boolean).join(', ');

    // Account identifier
    const district = span('lblDistrictWard_0');
    const accountNumber = span('lblAccountNumber_0');
    const accountId = district && accountNumber ? `${district}-${accountNumber}` : '';

    // Premises address
    const premAddr1 = span('lblPremisesAddress_0');
    const premAddr2 = span('lblPremisesAddress2_0');
    const premisesAddress = [premAddr1, premAddr2].filter(Boolean).join(', ');

    // Baths: "2 full/ 2 half"
    const bathText = span('Label28_0');
    const { fullBaths, halfBaths } = this.parseBaths(bathText);

    // Garage: "1 Attached"
    const garageText = span('Label29_0');
    const { garageSpaces, garageType } = this.parseGarage(garageText);

    // Phase-in assessment dates from table text
    const phaseInAssessments = this.parsePhaseInAssessments($);

    // Transfers
    const transfers = this.parseTransfers($);

    return {
      // Owner
      ownerNames,
      mailingAddress,
      deedReference: span('lblDeedReference_0'),
      principalResidence: span('lblPrincipalResidence_0').toUpperCase() === 'YES',
      propertyUse: span('lblUse_0'),

      // Location
      premisesAddress,
      accountId,
      district,
      legalDescription: span('lblLegalDescription_0'),
      map: span('lblMap_0'),
      grid: span('lblGrid_0'),
      parcel: span('lblParcel_0'),
      neighborhood: span('lblNeighborhood_0'),
      subdivisionCode: span('lblSubdivisionCode_0'),
      section: span('lblSection_0'),
      block: span('lblBlock_0'),
      lot: span('lblLot_0'),

      // Structure
      yearBuilt: this.parseIntValue(span('Label18_0')),
      aboveGradeLivingArea: this.parseIntValue(span('Label19_0')),
      finishedBasementArea: this.parseIntValue(span('Label20_0')),
      landArea: span('Label22_0') || '',
      stories: this.parseIntValue(span('Label23_0')),
      basement: span('Label24_0').toUpperCase() === 'YES',
      structureType: span('Label25_0'),
      exterior: span('Label26_0'),
      quality: span('Label27_0'),
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
        partialExempt: span('lblExemptions_0') || '',
      },
      homesteadStatus: span('lblHomesteadStatus_0'),
      homesteadApplicationDate: span('lblHomesteadDate_0'),
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

  private parsePhaseInAssessments(
    $: cheerio.CheerioAPI,
  ): SdatPropertyResult['phaseInAssessments'] {
    const assessments: SdatPropertyResult['phaseInAssessments'] = [];

    // Phase-in 1
    const land1 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInLand1_0`).text().trim(),
    );
    const improve1 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInImprove1_0`).text().trim(),
    );
    const total1 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInTotal1_0`).text().trim(),
    );

    // Phase-in 2
    const land2 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInLand2_0`).text().trim(),
    );
    const improve2 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInImprove2_0`).text().trim(),
    );
    const total2 = this.parseMoneyValue(
      $(`#${PREFIX}lblPhaseInTotal2_0`).text().trim(),
    );

    // Extract dates from table text - look for MM/DD/YYYY patterns near phase-in
    const phaseInSection = $('b:contains("Phase-in Assessments")').closest('tr').nextAll('tr');
    const dateRow = phaseInSection.first();
    const dateText = dateRow.text();
    const dates = dateText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];

    if (total1 > 0 || land1 > 0) {
      assessments.push({
        date: dates[0] || '',
        land: land1,
        improvements: improve1,
        total: total1,
      });
    }

    if (total2 > 0 || land2 > 0) {
      assessments.push({
        date: dates[1] || '',
        land: land2,
        improvements: improve2,
        total: total2,
      });
    }

    return assessments;
  }

  private parseTransfers(
    $: cheerio.CheerioAPI,
  ): SdatPropertyResult['transfers'] {
    const transfers: SdatPropertyResult['transfers'] = [];

    // Transfer 1: Labels 38-43
    // Transfer 2: Labels 44-49
    // Transfer 3: Labels 50-55
    const offsets = [
      { seller: 38, date: 39, price: 40, type: 41, deed1: 42, deed2: 43 },
      { seller: 44, date: 45, price: 46, type: 47, deed1: 48, deed2: 49 },
      { seller: 50, date: 51, price: 52, type: 53, deed1: 54, deed2: 55 },
    ];

    for (const o of offsets) {
      const seller = $(`#${PREFIX}Label${o.seller}_0`).text().trim();
      const date = $(`#${PREFIX}Label${o.date}_0`).text().trim();
      const price = this.parseMoneyValue(
        $(`#${PREFIX}Label${o.price}_0`).text().trim(),
      );
      const type = $(`#${PREFIX}Label${o.type}_0`).text().trim();
      const deedRef1 = $(`#${PREFIX}Label${o.deed1}_0`).text().trim();
      const deedRef2 = $(`#${PREFIX}Label${o.deed2}_0`).text().trim();

      if (seller || date) {
        transfers.push({ seller, date, price, type, deedRef1, deedRef2 });
      }
    }

    return transfers;
  }
}
