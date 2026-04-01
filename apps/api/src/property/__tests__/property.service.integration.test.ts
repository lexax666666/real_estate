import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyService } from '../property.service';
import { PropertyDbService } from '../property-db.service';
import { RentCastService } from '../rent-cast.service';
import { DatadogService } from '../../monitoring/datadog.service';
import { AddressParserService } from '../address-parser.service';

// Mock DatadogService
const mockDatadogService = {
  addTraceTags: vi.fn(),
  incrementMetric: vi.fn(),
  createCustomSpan: vi.fn((_name, fn) => fn()),
  trackError: vi.fn(),
};

// Mock RentCastService
const mockRentCastService = {
  fetchPropertyFromRentCast: vi.fn(),
  transformRentCastResponse: vi.fn(),
};

// Mock PropertyDbService
const mockPropertyDbService = {
  getPropertyFromDB: vi.fn(),
  savePropertyToDB: vi.fn(),
};

let service: PropertyService;
let addressParser: AddressParserService;

beforeEach(() => {
  vi.clearAllMocks();
  addressParser = new AddressParserService();
  service = new PropertyService(
    mockPropertyDbService as any,
    mockRentCastService as any,
    mockDatadogService as any,
    addressParser,
  );
});

describe('PropertyService - integration with AddressParserService', () => {
  it('should return DB result immediately when property exists (no stale check)', async () => {
    const cachedData = {
      data: {
        address: '123 Main St',
        city: 'Columbia',
        state: 'MD',
        propertyType: 'Single Family',
        ownerName: 'John Doe',
        bedrooms: 4,
        bathrooms: 2.5,
      },
      updatedAt: new Date('2020-01-01'), // Very old, but should still be returned
    };
    mockPropertyDbService.getPropertyFromDB.mockResolvedValue(cachedData);

    const result = await service.getProperty('123 main st columbia md 21045');

    expect(result._cached).toBe(true);
    expect(result.city).toBe('Columbia');
    expect(mockRentCastService.fetchPropertyFromRentCast).not.toHaveBeenCalled();
  });

  it('should return DB result for street-only search', async () => {
    const cachedData = {
      data: {
        address: '0 Maxwell Ln',
        city: 'North East',
        state: 'MD',
        propertyType: 'Single Family',
        ownerName: 'Test Owner',
        bedrooms: 3,
        bathrooms: 2,
      },
      updatedAt: new Date(),
    };
    mockPropertyDbService.getPropertyFromDB.mockResolvedValue(cachedData);

    const result = await service.getProperty('0 maxwell ln');

    expect(result._cached).toBe(true);
    expect(mockRentCastService.fetchPropertyFromRentCast).not.toHaveBeenCalled();
  });

  it('should return DB result for full address search', async () => {
    const cachedData = {
      data: {
        address: '0 Maxwell Ln',
        city: 'North East',
        state: 'MD',
        propertyType: 'Single Family',
        ownerName: 'Test Owner',
        bedrooms: 3,
        bathrooms: 2,
      },
      updatedAt: new Date(),
    };
    mockPropertyDbService.getPropertyFromDB.mockResolvedValue(cachedData);

    const result = await service.getProperty('0 maxwell ln north east md 21901');

    expect(result._cached).toBe(true);
    expect(mockRentCastService.fetchPropertyFromRentCast).not.toHaveBeenCalled();
  });

  it('should call RentCast with full parsed address when DB miss', async () => {
    mockPropertyDbService.getPropertyFromDB.mockResolvedValue(null);
    const rawProperty = { id: 'test', addressLine1: '0 Maxwell Ln' };
    mockRentCastService.fetchPropertyFromRentCast.mockResolvedValue(rawProperty);
    mockRentCastService.transformRentCastResponse.mockReturnValue({
      address: '0 Maxwell Ln',
      city: 'North East',
      state: 'MD',
      zipCode: '21901',
      propertyType: 'Single Family',
      ownerName: 'Test Owner',
      bedrooms: 3,
      bathrooms: 2,
    });
    mockPropertyDbService.savePropertyToDB.mockResolvedValue(true);

    const result = await service.getProperty('0 maxwell ln north east md 21901');

    expect(result._cached).toBe(false);
    // RentCast should be called with the full parsed address
    expect(mockRentCastService.fetchPropertyFromRentCast).toHaveBeenCalledWith(
      expect.stringContaining('0 maxwell ln'),
    );
    // Save should be called
    expect(mockPropertyDbService.savePropertyToDB).toHaveBeenCalled();
  });

  it('should NOT call RentCast when property exists regardless of cache age', async () => {
    // Even with very old data, should return from DB
    const veryOldCache = {
      data: {
        address: '999 Test Dr',
        city: 'Testville',
        state: 'TX',
        propertyType: 'Single Family',
        ownerName: 'Old Owner',
        bedrooms: 2,
        bathrooms: 1,
      },
      updatedAt: new Date('2019-01-01'), // 7+ years old
    };
    mockPropertyDbService.getPropertyFromDB.mockResolvedValue(veryOldCache);

    const result = await service.getProperty('999 test dr testville tx 75001');

    expect(result._cached).toBe(true);
    expect(result._cachedAt).toEqual(new Date('2019-01-01'));
    expect(mockRentCastService.fetchPropertyFromRentCast).not.toHaveBeenCalled();
  });
});
