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

    // Build street from: number + prefix + street + type
    // Exclude suffix (direction like N/NW) — it's unreliable with free-text input
    // and city/state/zip columns handle disambiguation
    const streetParts = [
      parsed.number,
      parsed.prefix,
      parsed.street,
      parsed.type,
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

    // Build full address for RentCast API (include suffix for API accuracy)
    const fullStreetParts = [...streetParts];
    if (parsed.suffix) {
      fullStreetParts.push(parsed.suffix.toLowerCase());
    }
    const fullStreet = fullStreetParts.join(' ');

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
}
