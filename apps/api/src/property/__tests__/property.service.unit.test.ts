import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertyService } from '../property.service';
import { AddressParserService } from '../address-parser.service';

const mockDatadogService = {
  addTraceTags: vi.fn(),
  incrementMetric: vi.fn(),
  createCustomSpan: vi.fn((_name: string, fn: () => any) => fn()),
  trackError: vi.fn(),
};

const mockRentCastService = {
  fetchPropertyFromRentCast: vi.fn(),
  transformRentCastResponse: vi.fn(),
};

const mockPropertyDbService = {
  getPropertyFromDB: vi.fn(),
  savePropertyToDB: vi.fn(),
  searchProperties: vi.fn(),
  autocompleteProperties: vi.fn(),
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

describe('PropertyService - getProperty orchestration', () => {
  describe('cache hit', () => {
    it('should return cached data when DB has the property', async () => {
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
        updatedAt: new Date('2025-04-20T12:00:00Z'),
      };
      mockPropertyDbService.getPropertyFromDB.mockResolvedValue(cachedData);

      const result = await service.getProperty('123 Main St Columbia MD 21045');

      expect(result._cached).toBe(true);
      expect(result._cachedAt).toEqual(new Date('2025-04-20T12:00:00Z'));
      expect(result.address).toBe('123 Main St');
      expect(result.city).toBe('Columbia');
      expect(mockRentCastService.fetchPropertyFromRentCast).not.toHaveBeenCalled();
    });

    it('should track cache hit metrics in datadog', async () => {
      const cachedData = {
        data: {
          address: '456 Oak Ave',
          city: 'Baltimore',
          state: 'MD',
          propertyType: 'Condo',
          ownerName: 'Jane Smith',
          bedrooms: 2,
          bathrooms: 1,
        },
        updatedAt: new Date(),
      };
      mockPropertyDbService.getPropertyFromDB.mockResolvedValue(cachedData);

      await service.getProperty('456 Oak Ave Baltimore MD');

      expect(mockDatadogService.addTraceTags).toHaveBeenCalledWith(
        expect.objectContaining({
          'cache.hit': true,
          'data.source': 'database_cache',
        }),
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.cache.hit',
        1,
        { source: 'database' },
      );
    });
  });

  describe('cache miss', () => {
    it('should call RentCast, transform, save, and return fresh data', async () => {
      // Arrange
      mockPropertyDbService.getPropertyFromDB.mockResolvedValue(null);

      const rawProperty = {
        id: 'test-prop',
        addressLine1: '789 Elm Blvd',
        city: 'Portland',
        state: 'OR',
      };
      mockRentCastService.fetchPropertyFromRentCast.mockResolvedValue(rawProperty);

      const transformedData = {
        address: '789 Elm Blvd',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        propertyType: 'Single Family',
        ownerName: 'Bob Builder',
        bedrooms: 3,
        bathrooms: 2,
      };
      mockRentCastService.transformRentCastResponse.mockReturnValue(transformedData);
      mockPropertyDbService.savePropertyToDB.mockResolvedValue(true);

      // Act
      const result = await service.getProperty('789 Elm Blvd Portland OR 97201');

      // Assert
      expect(result._cached).toBe(false);
      expect(result.address).toBe('789 Elm Blvd');
      expect(result.city).toBe('Portland');
      expect(mockRentCastService.fetchPropertyFromRentCast).toHaveBeenCalled();
      expect(mockRentCastService.transformRentCastResponse).toHaveBeenCalledWith(rawProperty);
      expect(mockPropertyDbService.savePropertyToDB).toHaveBeenCalledWith(
        '789 Elm Blvd Portland OR 97201',
        transformedData,
      );
    });

    it('should track cache miss and API success metrics', async () => {
      mockPropertyDbService.getPropertyFromDB.mockResolvedValue(null);
      mockRentCastService.fetchPropertyFromRentCast.mockResolvedValue({
        addressLine1: '100 Test St',
      });
      mockRentCastService.transformRentCastResponse.mockReturnValue({
        address: '100 Test St',
        propertyType: 'Single Family',
      });
      mockPropertyDbService.savePropertyToDB.mockResolvedValue(true);

      await service.getProperty('100 Test St');

      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.cache.miss',
        1,
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.api.success',
        1,
        { source: 'rentcast' },
      );
    });
  });

  describe('RentCast errors', () => {
    beforeEach(() => {
      mockPropertyDbService.getPropertyFromDB.mockResolvedValue(null);
    });

    it('should throw InternalServerErrorException when API key is not configured', async () => {
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(
        new Error('RENTCAST_API_KEY is not configured'),
      );

      await expect(
        service.getProperty('123 Main St'),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.getProperty('123 Main St'),
      ).rejects.toThrow('API configuration error');
    });

    it('should throw NotFoundException when property is not found', async () => {
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(
        new Error('Property not found'),
      );

      await expect(
        service.getProperty('999 Nonexistent Ave'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getProperty('999 Nonexistent Ave'),
      ).rejects.toThrow('Property not found at the specified address');
    });

    it('should throw UnauthorizedException when RentCast returns 401', async () => {
      const axiosError = new Error('Request failed with status code 401') as any;
      axiosError.response = { status: 401 };
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(axiosError);

      await expect(
        service.getProperty('123 Main St'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when RentCast returns 404', async () => {
      const axiosError = new Error('Request failed with status code 404') as any;
      axiosError.response = { status: 404 };
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(axiosError);

      await expect(
        service.getProperty('123 Main St'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for unknown API errors', async () => {
      const axiosError = new Error('Network timeout') as any;
      axiosError.response = { status: 500 };
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(axiosError);

      await expect(
        service.getProperty('123 Main St'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should track API errors in datadog', async () => {
      const apiError = new Error('Property not found');
      mockRentCastService.fetchPropertyFromRentCast.mockRejectedValue(apiError);

      await expect(service.getProperty('123 Main St')).rejects.toThrow();

      expect(mockDatadogService.trackError).toHaveBeenCalledWith(
        apiError,
        expect.objectContaining({
          source: 'rentcast_api',
        }),
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.api.error',
        1,
        { source: 'rentcast' },
      );
    });
  });
});
