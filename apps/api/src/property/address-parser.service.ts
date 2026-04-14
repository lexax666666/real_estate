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
  private readonly ABBREVIATIONS: Record<string, string> = {
    st: 'street',
    street: 'st',
    ave: 'avenue',
    avenue: 'ave',
    rd: 'road',
    road: 'rd',
    dr: 'drive',
    drive: 'dr',
    ln: 'lane',
    lane: 'ln',
    blvd: 'boulevard',
    boulevard: 'blvd',
    ct: 'court',
    court: 'ct',
    pl: 'place',
    place: 'pl',
    cir: 'circle',
    circle: 'cir',
    pkwy: 'parkway',
    parkway: 'pkwy',
    trl: 'trail',
    trail: 'trl',
    ter: 'terrace',
    terrace: 'ter',
    n: 'north',
    north: 'n',
    s: 'south',
    south: 's',
    e: 'east',
    east: 'e',
    w: 'west',
    west: 'w',
    ne: 'northeast',
    northeast: 'ne',
    nw: 'northwest',
    northwest: 'nw',
    se: 'southeast',
    southeast: 'se',
    sw: 'southwest',
    southwest: 'sw',
    apt: 'apartment',
    apartment: 'apt',
  };

  private readonly US_STATES = new Set([
    'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga',
    'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md',
    'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
    'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc',
    'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy',
    'dc',
  ]);

  private readonly NOISE_WORDS = new Set([
    'my', 'the', 'a', 'an', 'at', 'is', 'in', 'on', 'of', 'for',
    'to', 'and', 'or', 'house', 'address', 'property', 'located',
  ]);

  expandAbbreviations(token: string): string[] {
    const lower = token.toLowerCase();
    const synonym = this.ABBREVIATIONS[lower];
    return synonym ? [lower, synonym] : [lower];
  }

  tokenizeSearchInput(input: string): string[] {
    return input
      .toLowerCase()
      .replace(/[,\-\/\\]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  classifyToken(token: string): 'house_number' | 'zip' | 'state' | 'noise' | 'word' {
    if (this.NOISE_WORDS.has(token)) return 'noise';
    if (/^\d+$/.test(token)) {
      if (token.length === 5) return 'zip';
      return 'house_number';
    }
    if (token.length === 2 && this.US_STATES.has(token)) return 'state';
    return 'word';
  }

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
