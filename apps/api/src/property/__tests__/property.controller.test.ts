import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { PropertyController } from '../property.controller';

const mockPropertyService = {
  searchProperty: vi.fn(),
  autocompleteProperty: vi.fn(),
  getProperty: vi.fn(),
};

const mockDatadogService = {
  addTraceTags: vi.fn(),
  incrementMetric: vi.fn(),
  createCustomSpan: vi.fn((_name: string, fn: () => any) => fn()),
  trackError: vi.fn(),
};

let controller: PropertyController;

beforeEach(() => {
  vi.clearAllMocks();
  controller = new PropertyController(
    mockPropertyService as any,
    mockDatadogService as any,
  );
});

describe('PropertyController', () => {
  describe('searchProperty', () => {
    it('should throw BadRequestException when q is missing', async () => {
      await expect(
        controller.searchProperty(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when q is empty string', async () => {
      await expect(controller.searchProperty('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when limit is 0', async () => {
      await expect(
        controller.searchProperty('test query', '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is -1', async () => {
      await expect(
        controller.searchProperty('test query', '-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is 51', async () => {
      await expect(
        controller.searchProperty('test query', '51'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is non-numeric', async () => {
      await expect(
        controller.searchProperty('test query', 'abc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call propertyService.searchProperty with default limit 10', async () => {
      mockPropertyService.searchProperty.mockResolvedValue({
        results: [],
        topMatch: null,
        autoSelected: false,
      });

      await controller.searchProperty('123 main st');

      expect(mockPropertyService.searchProperty).toHaveBeenCalledWith(
        '123 main st',
        10,
      );
    });

    it('should call propertyService.searchProperty with provided valid limit', async () => {
      mockPropertyService.searchProperty.mockResolvedValue({
        results: [],
        topMatch: null,
        autoSelected: false,
      });

      await controller.searchProperty('123 main st', '25');

      expect(mockPropertyService.searchProperty).toHaveBeenCalledWith(
        '123 main st',
        25,
      );
    });

    it('should accept limit of 1 (minimum valid)', async () => {
      mockPropertyService.searchProperty.mockResolvedValue({
        results: [],
        topMatch: null,
        autoSelected: false,
      });

      await controller.searchProperty('test', '1');

      expect(mockPropertyService.searchProperty).toHaveBeenCalledWith('test', 1);
    });

    it('should accept limit of 50 (maximum valid)', async () => {
      mockPropertyService.searchProperty.mockResolvedValue({
        results: [],
        topMatch: null,
        autoSelected: false,
      });

      await controller.searchProperty('test', '50');

      expect(mockPropertyService.searchProperty).toHaveBeenCalledWith('test', 50);
    });

    it('should rethrow HttpException from service', async () => {
      const httpError = new NotFoundException('Not found');
      mockPropertyService.searchProperty.mockRejectedValue(httpError);

      await expect(
        controller.searchProperty('test query'),
      ).rejects.toThrow(httpError);
    });

    it('should wrap non-HttpException errors in InternalServerErrorException', async () => {
      mockPropertyService.searchProperty.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await expect(
        controller.searchProperty('test query'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('autocompleteProperty', () => {
    it('should throw BadRequestException when q is missing', async () => {
      await expect(
        controller.autocompleteProperty(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when q is empty string', async () => {
      await expect(controller.autocompleteProperty('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when limit is 0', async () => {
      await expect(
        controller.autocompleteProperty('test', '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is -1', async () => {
      await expect(
        controller.autocompleteProperty('test', '-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is 21', async () => {
      await expect(
        controller.autocompleteProperty('test', '21'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is non-numeric', async () => {
      await expect(
        controller.autocompleteProperty('test', 'abc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call propertyService.autocompleteProperty with default limit 5', async () => {
      mockPropertyService.autocompleteProperty.mockResolvedValue([]);

      await controller.autocompleteProperty('123 ma');

      expect(mockPropertyService.autocompleteProperty).toHaveBeenCalledWith(
        '123 ma',
        5,
      );
    });

    it('should call propertyService.autocompleteProperty with provided valid limit', async () => {
      mockPropertyService.autocompleteProperty.mockResolvedValue([]);

      await controller.autocompleteProperty('123 ma', '15');

      expect(mockPropertyService.autocompleteProperty).toHaveBeenCalledWith(
        '123 ma',
        15,
      );
    });

    it('should accept limit of 1 (minimum valid)', async () => {
      mockPropertyService.autocompleteProperty.mockResolvedValue([]);

      await controller.autocompleteProperty('test', '1');

      expect(mockPropertyService.autocompleteProperty).toHaveBeenCalledWith(
        'test',
        1,
      );
    });

    it('should accept limit of 20 (maximum valid)', async () => {
      mockPropertyService.autocompleteProperty.mockResolvedValue([]);

      await controller.autocompleteProperty('test', '20');

      expect(mockPropertyService.autocompleteProperty).toHaveBeenCalledWith(
        'test',
        20,
      );
    });

    it('should rethrow HttpException from service', async () => {
      const httpError = new NotFoundException('Not found');
      mockPropertyService.autocompleteProperty.mockRejectedValue(httpError);

      await expect(
        controller.autocompleteProperty('test'),
      ).rejects.toThrow(httpError);
    });

    it('should wrap non-HttpException errors in InternalServerErrorException', async () => {
      mockPropertyService.autocompleteProperty.mockRejectedValue(
        new Error('Unexpected failure'),
      );

      await expect(
        controller.autocompleteProperty('test'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getProperty', () => {
    it('should throw BadRequestException when address is missing', async () => {
      await expect(
        controller.getProperty(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when address is empty string', async () => {
      await expect(controller.getProperty('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return result from propertyService for valid address', async () => {
      const mockResult = {
        address: '123 Main St',
        city: 'Columbia',
        state: 'MD',
        _cached: true,
      };
      mockPropertyService.getProperty.mockResolvedValue(mockResult);

      const result = await controller.getProperty('123 Main St Columbia MD');

      expect(result).toEqual(mockResult);
      expect(mockPropertyService.getProperty).toHaveBeenCalledWith(
        '123 Main St Columbia MD',
      );
    });

    it('should pass through HttpException from service', async () => {
      const notFoundError = new NotFoundException(
        'Property not found at the specified address',
      );
      mockPropertyService.getProperty.mockRejectedValue(notFoundError);

      await expect(
        controller.getProperty('999 Nonexistent Ave'),
      ).rejects.toThrow(notFoundError);
    });

    it('should wrap generic errors in InternalServerErrorException', async () => {
      mockPropertyService.getProperty.mockRejectedValue(
        new Error('Something unexpected'),
      );

      await expect(
        controller.getProperty('123 Main St'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should track error in datadog when generic error occurs', async () => {
      const genericError = new Error('DB timeout');
      mockPropertyService.getProperty.mockRejectedValue(genericError);

      await expect(controller.getProperty('123 Main St')).rejects.toThrow();

      expect(mockDatadogService.trackError).toHaveBeenCalledWith(
        genericError,
        expect.objectContaining({
          address: '123 Main St',
          source: 'server',
        }),
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.server.error',
        1,
      );
    });

    it('should add trace tags with address on valid request', async () => {
      mockPropertyService.getProperty.mockResolvedValue({ address: '123 Main St' });

      await controller.getProperty('123 Main St');

      expect(mockDatadogService.addTraceTags).toHaveBeenCalledWith(
        expect.objectContaining({
          'property.address': '123 Main St',
          'request.endpoint': '/api/property',
        }),
      );
    });
  });
});
