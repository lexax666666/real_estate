declare module 'parse-address' {
  interface ParsedAddress {
    number?: string;
    prefix?: string;
    street?: string;
    type?: string;
    suffix?: string;
    city?: string;
    state?: string;
    zip?: string;
    sec_unit_type?: string;
    sec_unit_num?: string;
  }

  function parseLocation(address: string): ParsedAddress;

  export { parseLocation, ParsedAddress };
}
