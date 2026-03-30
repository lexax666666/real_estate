export interface AddressComponents {
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Parse a US address string into components.
 * Handles formats like:
 * - "123 Main St, City, ST 12345"
 * - "123 MAIN ST, CITY, ST 12345-6789"
 * - "123 Main Street City ST"
 */
export function parseAddress(address: string): AddressComponents {
  const trimmed = address.trim();

  // Split on commas first
  const parts = trimmed.split(',').map((p) => p.trim());

  let streetNumber = '';
  let streetName = '';
  let city = '';
  let state = '';
  let zipCode = '';

  if (parts.length >= 1) {
    // First part is street address: "123 Main St"
    const streetParts = parts[0].split(/\s+/);
    streetNumber = streetParts[0] || '';
    streetName = streetParts.slice(1).join(' ');
  }

  if (parts.length >= 2) {
    city = parts[1].trim();
  }

  if (parts.length >= 3) {
    // Last part may contain state and zip: "MD 21045" or "MD 21045-6789"
    const lastPart = parts[parts.length - 1].trim().split(/\s+/);
    if (lastPart.length >= 1 && /^[A-Z]{2}$/i.test(lastPart[0])) {
      state = lastPart[0].toUpperCase();
      zipCode = lastPart.slice(1).join(' ');
      // If city was actually "City ST 12345" without comma
      if (parts.length === 2) {
        const cityParts = city.split(/\s+/);
        if (
          cityParts.length >= 2 &&
          /^[A-Z]{2}$/i.test(cityParts[cityParts.length - 2])
        ) {
          zipCode =
            cityParts[cityParts.length - 1];
          state = cityParts[cityParts.length - 2].toUpperCase();
          city = cityParts.slice(0, -2).join(' ');
        }
      }
    }
  }

  return { streetNumber, streetName, city, state, zipCode };
}
