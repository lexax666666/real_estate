import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RentCastService } from '../rent-cast.service';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

let service: RentCastService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new RentCastService();
});

afterEach(() => {
  delete process.env.RENTCAST_API_KEY;
  delete process.env.RENTCAST_API_URL;
});

describe('RentCastService', () => {
  describe('transformRentCastResponse', () => {
    it('should transform a full property response', () => {
      const property = {
        addressLine1: '9354 Westering Sun Dr',
        formattedAddress: '9354 Westering Sun Dr, Columbia, MD 21045',
        city: 'Columbia',
        state: 'MD',
        zipCode: '21045',
        owner: { names: ['John Doe', 'Jane Doe'] },
        propertyType: 'Single Family',
        yearBuilt: 2000,
        squareFootage: 2500,
        lotSize: 5000,
        bedrooms: 4,
        bathrooms: 2.5,
        features: { floorCount: 2, basement: true, garageSpaces: 2 },
        lastSaleDate: '2020-01-15',
        lastSalePrice: 350000,
        taxAssessments: {
          '2022': { land: 100000, improvements: 200000, value: 300000 },
          '2023': { land: 110000, improvements: 210000, value: 320000 },
        },
        propertyTaxes: {
          '2022': { total: 4500 },
          '2023': { total: 4800 },
        },
        neighborhood: 'Hickory Ridge',
        subdivision: 'Westering Sun',
        county: 'Howard',
        latitude: 39.2,
        longitude: -76.8,
        hoaFee: 150,
        ownerOccupied: true,
        zoning: 'R-1',
        assessorID: 'ABC123',
        legalDescription: 'Lot 10 Block A',
        history: [{ date: '2020-01-15', price: 350000 }],
      };

      const result = service.transformRentCastResponse(property);

      expect(result.address).toBe('9354 Westering Sun Dr');
      expect(result.city).toBe('Columbia');
      expect(result.state).toBe('MD');
      expect(result.zipCode).toBe('21045');
      expect(result.ownerName).toBe('John Doe, Jane Doe');
      expect(result.propertyType).toBe('Single Family');
      expect(result.yearBuilt).toBe(2000);
      expect(result.squareFootage).toBe(2500);
      expect(result.lotSize).toBe(5000);
      expect(result.bedrooms).toBe(4);
      expect(result.bathrooms).toBe(2.5);
      expect(result.fullBathrooms).toBe(2);
      expect(result.halfBathrooms).toBe(1);
      expect(result.stories).toBe(2);
      expect(result.basement).toBe(true);
      expect(result.garage).toBe(2);
      expect(result.lastSaleDate).toBe('2020-01-15');
      expect(result.lastSalePrice).toBe(350000);
      expect(result.assessedValue).toEqual({
        land: 110000,
        building: 210000,
        total: 320000,
      });
      expect(result.assessedDate).toBe(2023);
      expect(result.neighborhood).toBe('Hickory Ridge');
      expect(result.subdivision).toBe('Westering Sun');
      expect(result.county).toBe('Howard');
      expect(result.latitude).toBe(39.2);
      expect(result.longitude).toBe(-76.8);
      expect(result.taxAmount).toBe(4800);
      expect(result.hoaFee).toBe(150);
      expect(result.ownerOccupied).toBe(true);
      expect(result.zoning).toBe('R-1');
      expect(result.assessorID).toBe('ABC123');
      expect(result.legalDescription).toBe('Lot 10 Block A');
      expect(result.taxAssessments).toEqual(property.taxAssessments);
      expect(result.propertyTaxes).toEqual(property.propertyTaxes);
      expect(result.history).toEqual(property.history);
    });

    it('should extract the latest tax assessment year', () => {
      const property = {
        taxAssessments: {
          '2020': { land: 80000, improvements: 160000, value: 240000 },
          '2023': { land: 110000, improvements: 210000, value: 320000 },
          '2021': { land: 90000, improvements: 170000, value: 260000 },
        },
        propertyTaxes: null,
      };

      const result = service.transformRentCastResponse(property);

      expect(result.assessedDate).toBe(2023);
      expect(result.assessedValue.total).toBe(320000);
    });

    it('should handle missing taxAssessments with empty objects', () => {
      const property = {
        taxAssessments: null,
        propertyTaxes: null,
      };

      const result = service.transformRentCastResponse(property);

      expect(result.assessedDate).toBeNull();
      expect(result.assessedValue).toEqual({ land: 0, building: 0, total: 0 });
      expect(result.taxAmount).toBeUndefined();
    });

    it('should handle missing propertyTaxes with empty objects', () => {
      const property = {
        taxAssessments: null,
        propertyTaxes: undefined,
      };

      const result = service.transformRentCastResponse(property);

      expect(result.taxAmount).toBeUndefined();
    });

    it('should join owner names with comma and space', () => {
      const property = {
        owner: { names: ['Alice Smith', 'Bob Smith', 'Carol Smith'] },
      };

      const result = service.transformRentCastResponse(property);

      expect(result.ownerName).toBe('Alice Smith, Bob Smith, Carol Smith');
    });

    it('should return N/A when owner names are missing', () => {
      const property = {
        owner: null,
      };

      const result = service.transformRentCastResponse(property);

      expect(result.ownerName).toBe('N/A');
    });

    it('should return N/A when owner has no names array', () => {
      const property = {
        owner: { names: undefined },
      };

      const result = service.transformRentCastResponse(property);

      expect(result.ownerName).toBe('N/A');
    });

    it('should prefer addressLine1 over formattedAddress', () => {
      const property = {
        addressLine1: '123 Main St',
        formattedAddress: '123 Main St, Columbia, MD 21045',
      };

      const result = service.transformRentCastResponse(property);

      expect(result.address).toBe('123 Main St');
    });

    it('should fall back to formattedAddress when addressLine1 is missing', () => {
      const property = {
        addressLine1: null,
        formattedAddress: '123 Main St, Columbia, MD 21045',
      };

      const result = service.transformRentCastResponse(property);

      expect(result.address).toBe('123 Main St, Columbia, MD 21045');
    });

    it('should extract features: floorCount as stories, basement, garageSpaces as garage', () => {
      const property = {
        features: {
          floorCount: 3,
          basement: false,
          garageSpaces: 1,
        },
      };

      const result = service.transformRentCastResponse(property);

      expect(result.stories).toBe(3);
      expect(result.basement).toBe(false);
      expect(result.garage).toBe(1);
    });

    it('should handle null and undefined fields gracefully', () => {
      const property = {
        addressLine1: null,
        formattedAddress: null,
        city: null,
        state: null,
        zipCode: null,
        owner: null,
        propertyType: null,
        yearBuilt: null,
        squareFootage: null,
        lotSize: null,
        bedrooms: null,
        bathrooms: null,
        features: null,
        lastSaleDate: null,
        lastSalePrice: null,
        taxAssessments: null,
        propertyTaxes: null,
        neighborhood: null,
        subdivision: null,
        county: null,
        latitude: null,
        longitude: null,
        hoaFee: null,
        ownerOccupied: null,
        zoning: null,
        assessorID: null,
        legalDescription: null,
        history: null,
      };

      const result = service.transformRentCastResponse(property);

      expect(result.address).toBeNull();
      expect(result.city).toBeNull();
      expect(result.ownerName).toBe('N/A');
      expect(result.propertyType).toBe('Residential');
      expect(result.stories).toBeUndefined();
      expect(result.basement).toBeUndefined();
      expect(result.garage).toBeUndefined();
      expect(result.assessedValue).toEqual({ land: 0, building: 0, total: 0 });
    });

    it('should default propertyType to Residential when not provided', () => {
      const property = {};

      const result = service.transformRentCastResponse(property);

      expect(result.propertyType).toBe('Residential');
    });

    it('should not override owner name for any property id', () => {
      const property = {
        id: '9354-Westering-Sun,-Columbia,-MD-21045',
        owner: { names: ['Original Owner'] },
      };

      const result = service.transformRentCastResponse(property);

      expect(result.ownerName).toBe('Original Owner');
    });

    it('should compute fullBathrooms and halfBathrooms from total', () => {
      const property = { bathrooms: 3.5 };
      const result = service.transformRentCastResponse(property);
      expect(result.fullBathrooms).toBe(3);
      expect(result.halfBathrooms).toBe(1);
    });

    it('should return 0 halfBathrooms for whole number', () => {
      const property = { bathrooms: 2 };
      const result = service.transformRentCastResponse(property);
      expect(result.fullBathrooms).toBe(2);
      expect(result.halfBathrooms).toBe(0);
    });

    it('should handle null bathrooms', () => {
      const property = { bathrooms: null };
      const result = service.transformRentCastResponse(property);
      expect(result.fullBathrooms).toBe(0);
      expect(result.halfBathrooms).toBe(0);
    });
  });

  describe('fetchPropertyFromRentCast', () => {
    it('should throw when RENTCAST_API_KEY is not configured', async () => {
      delete process.env.RENTCAST_API_KEY;

      await expect(
        service.fetchPropertyFromRentCast('123 Main St'),
      ).rejects.toThrow('RENTCAST_API_KEY is not configured');
    });

    it('should throw when response data is empty', async () => {
      process.env.RENTCAST_API_KEY = 'test-key';

      mockedAxios.get.mockResolvedValue({ data: [] });

      await expect(
        service.fetchPropertyFromRentCast('123 Main St'),
      ).rejects.toThrow('Property not found');
    });

    it('should throw when response data is null', async () => {
      process.env.RENTCAST_API_KEY = 'test-key';

      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(
        service.fetchPropertyFromRentCast('123 Main St'),
      ).rejects.toThrow('Property not found');
    });

    it('should return the first item from the response', async () => {
      process.env.RENTCAST_API_KEY = 'test-key';
      const mockProperty = { id: 'prop-1', addressLine1: '123 Main St' };

      mockedAxios.get.mockResolvedValue({
        data: [mockProperty, { id: 'prop-2' }],
      });

      const result = await service.fetchPropertyFromRentCast('123 Main St');

      expect(result).toEqual(mockProperty);
    });

    it('should call axios with correct headers and params', async () => {
      process.env.RENTCAST_API_KEY = 'my-api-key';
      process.env.RENTCAST_API_URL = 'https://custom-api.example.com/v1';

      mockedAxios.get.mockResolvedValue({
        data: [{ id: 'prop-1' }],
      });

      await service.fetchPropertyFromRentCast('456 Oak Ave');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://custom-api.example.com/v1/properties',
        {
          headers: {
            'X-Api-Key': 'my-api-key',
            Accept: 'application/json',
          },
          params: {
            address: '456 Oak Ave',
            limit: 1,
          },
        },
      );
    });

    it('should use default API URL when RENTCAST_API_URL is not set', async () => {
      process.env.RENTCAST_API_KEY = 'test-key';
      delete process.env.RENTCAST_API_URL;

      mockedAxios.get.mockResolvedValue({
        data: [{ id: 'prop-1' }],
      });

      await service.fetchPropertyFromRentCast('123 Main St');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.rentcast.io/v1/properties',
        expect.any(Object),
      );
    });
  });
});
