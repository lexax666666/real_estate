export interface SdatSearchParams {
  county: string;
  streetNumber: string;
  streetName: string;
}

export interface SdatPropertyResult {
  // Owner
  ownerNames: string[];
  mailingAddress: string;
  deedReference: string;
  principalResidence: boolean;
  propertyUse: string;

  // Location
  premisesAddress: string;
  accountId: string;
  district: string;
  legalDescription: string;
  map: string;
  grid: string;
  parcel: string;
  neighborhood: string;
  subdivisionCode: string;
  section: string;
  block: string;
  lot: string;

  // Structure
  yearBuilt: number | null;
  aboveGradeLivingArea: number | null;
  finishedBasementArea: number | null;
  landArea: string;
  stories: number | null;
  basement: boolean;
  structureType: string;
  exterior: string;
  quality: string;
  fullBaths: number | null;
  halfBaths: number | null;
  garageType: string;
  garageSpaces: number | null;

  // Values
  baseValue: { land: number; improvements: number; total: number };
  currentValue: { land: number; improvements: number; total: number };
  phaseInAssessments: Array<{
    date: string;
    land: number;
    improvements: number;
    total: number;
  }>;

  // Transfers
  transfers: Array<{
    seller: string;
    date: string;
    price: number;
    type: string;
    deedRef1: string;
    deedRef2: string;
  }>;

  // Exemptions & Homestead
  exemptions: Record<string, string>;
  homesteadStatus: string;
  homesteadApplicationDate: string;
}
