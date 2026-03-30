export const SDAT_URL =
  'https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx';

export const SDAT_SITE_ID = 'md-sdat';
export const SDAT_SITE_NAME = 'Maryland SDAT Real Property Search';

// ASP.NET WebForms element selectors
export const SELECTORS = {
  // Step 1: County + search type selection
  countyDropdown:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucSearchType_ddlCounty',
  searchTypeDropdown:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucSearchType_ddlSearchType',
  continueButton:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_StartNavigationTemplateContainerID_btnContinue',

  // Step 2: Address input
  streetNumberInput:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucEnterData_txtStreenNumber',
  streetNameInput:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucEnterData_txtStreetName',
  stepNextButton:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_StepNavigationTemplateContainerID_btnStepNextButton',

  // Results
  resultsTable:
    '#cphMainContentArea_ucSearchType_wzrdRealPropertySearch_ucDetailsSearch_dlstDetaisSearch',
} as const;

// Search type dropdown values
export const SEARCH_TYPES = {
  STREET_ADDRESS: '01',
  PROPERTY_ACCOUNT: '02',
  MAP_PARCEL: '03',
  PROPERTY_SALES: '04',
} as const;

// County name → SDAT dropdown value mapping
export const MARYLAND_COUNTIES: Record<string, string> = {
  ALLEGANY: '01',
  'ANNE ARUNDEL': '02',
  'BALTIMORE CITY': '03',
  'BALTIMORE COUNTY': '04',
  CALVERT: '05',
  CAROLINE: '06',
  CARROLL: '07',
  CECIL: '08',
  CHARLES: '09',
  DORCHESTER: '10',
  FREDERICK: '11',
  GARRETT: '12',
  HARFORD: '13',
  HOWARD: '14',
  KENT: '15',
  MONTGOMERY: '16',
  "PRINCE GEORGE'S": '17',
  "QUEEN ANNE'S": '18',
  "ST. MARY'S": '19',
  SOMERSET: '20',
  TALBOT: '21',
  WASHINGTON: '22',
  WICOMICO: '23',
  WORCESTER: '24',
};

// Reverse mapping: code → county name
export const COUNTY_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(MARYLAND_COUNTIES).map(([name, code]) => [code, name]),
);
