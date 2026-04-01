import { Injectable } from '@nestjs/common';
import { parseLocation } from 'parse-address';

export interface ParsedAddress {
  streetAddress: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  fullAddress: string;
}

@Injectable()
export class AddressParserService {
  parseAddress(input: string): ParsedAddress {
    const trimmed = input.trim().toLowerCase();
    const parsed = parseLocation(trimmed);

    this.applyExceptionCases(parsed);

    const streetParts = [
      parsed.number,
      parsed.prefix,
      parsed.street,
      parsed.type,
      parsed.suffix,
    ]
      .filter(Boolean)
      .map((p) => p!.toLowerCase());

    // Include unit info if present (e.g., "apt 2", "unit b")
    if (parsed.sec_unit_type) {
      streetParts.push(parsed.sec_unit_type.toLowerCase());
      if (parsed.sec_unit_num) {
        streetParts.push(parsed.sec_unit_num.toLowerCase());
      }
    }

    const streetAddress = streetParts.join(' ');

    const city = parsed.city?.toLowerCase() || null;
    const state = parsed.state?.toLowerCase() || null;
    const zip = parsed.zip || null;

    // Build full address for RentCast API
    const fullStreet = streetParts.join(' ');

    const fullParts = [fullStreet];
    if (city) fullParts.push(city);
    if (state) fullParts.push(state);
    if (zip) fullParts.push(zip);
    const fullAddress = fullParts.join(', ');

    return {
      streetAddress,
      city,
      state,
      zip,
      fullAddress,
    };
  }

  private applyExceptionCases(parsed: ReturnType<typeof parseLocation>): void {
    // "0 maxwell ln north east md 21901" — parse-address reads "north" as
    // suffix "N" and city as "east". Correct to city "north east", no suffix.
    if (
      parsed.city?.toLowerCase() === 'east' &&
      parsed.suffix?.toLowerCase() === 'n'
    ) {
      parsed.city = 'north east';
      parsed.suffix = undefined as any;
    }
  }
}
