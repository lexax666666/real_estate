import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyService } from '../property.service';
import { PropertyDbService, SearchResponse, SearchResult } from '../property-db.service';
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

describe('PropertyService - Search', () => {
  describe('searchProperty', () => {
    it('should call propertyDbService.searchProperties with query and limit', async () => {
      const mockResponse: SearchResponse = {
        results: [],
        topMatch: null,
        autoSelected: false,
      };
      mockPropertyDbService.searchProperties.mockResolvedValue(mockResponse);

      const result = await service.searchProperty('9354 westering sun', 10);

      expect(mockPropertyDbService.searchProperties).toHaveBeenCalledWith(
        '9354 westering sun',
        10,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should track search metrics in datadog', async () => {
      const mockResults: SearchResult[] = [
        {
          id: 1,
          address: '9354 westering sun dr',
          formattedAddress: '9354 Westering Sun Dr',
          city: 'Columbia',
          state: 'MD',
          zipCode: '21045',
          score: 7.5,
        },
      ];
      mockPropertyDbService.searchProperties.mockResolvedValue({
        results: mockResults,
        topMatch: null,
        autoSelected: false,
      });

      await service.searchProperty('9354 westering sun', 10);

      expect(mockDatadogService.addTraceTags).toHaveBeenCalledWith(
        expect.objectContaining({
          'search.query': '9354 westering sun',
          'search.limit': 10,
        }),
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.search',
        1,
      );
    });

    it('should use default limit of 10', async () => {
      mockPropertyDbService.searchProperties.mockResolvedValue({
        results: [],
        topMatch: null,
        autoSelected: false,
      });

      await service.searchProperty('test query');

      expect(mockPropertyDbService.searchProperties).toHaveBeenCalledWith(
        'test query',
        10,
      );
    });

    it('should return auto-selected result when present', async () => {
      const topMatch = {
        address: '9354 Westering Sun Dr',
        city: 'Columbia',
        state: 'MD',
      };
      mockPropertyDbService.searchProperties.mockResolvedValue({
        results: [
          {
            id: 1,
            address: '9354 westering sun dr',
            formattedAddress: null,
            city: 'Columbia',
            state: 'MD',
            zipCode: '21045',
            score: 7.5,
          },
        ],
        topMatch,
        autoSelected: true,
      });

      const result = await service.searchProperty(
        '9354 westering sun dr columbia md 21045',
      );

      expect(result.autoSelected).toBe(true);
      expect(result.topMatch).toEqual(topMatch);
    });
  });

  describe('autocompleteProperty', () => {
    it('should call propertyDbService.autocompleteProperties with query and limit', async () => {
      const mockResults: SearchResult[] = [];
      mockPropertyDbService.autocompleteProperties.mockResolvedValue(
        mockResults,
      );

      const result = await service.autocompleteProperty('9354 we', 5);

      expect(
        mockPropertyDbService.autocompleteProperties,
      ).toHaveBeenCalledWith('9354 we', 5);
      expect(result).toEqual(mockResults);
    });

    it('should track autocomplete metrics in datadog', async () => {
      mockPropertyDbService.autocompleteProperties.mockResolvedValue([]);

      await service.autocompleteProperty('test', 5);

      expect(mockDatadogService.addTraceTags).toHaveBeenCalledWith(
        expect.objectContaining({
          'autocomplete.query': 'test',
        }),
      );
      expect(mockDatadogService.incrementMetric).toHaveBeenCalledWith(
        'property.autocomplete',
        1,
      );
    });

    it('should use default limit of 5', async () => {
      mockPropertyDbService.autocompleteProperties.mockResolvedValue([]);

      await service.autocompleteProperty('test');

      expect(
        mockPropertyDbService.autocompleteProperties,
      ).toHaveBeenCalledWith('test', 5);
    });

    it('should return search results array', async () => {
      const mockResults: SearchResult[] = [
        {
          id: 1,
          address: '9354 westering sun dr',
          formattedAddress: '9354 Westering Sun Dr',
          city: 'Columbia',
          state: 'MD',
          zipCode: '21045',
          score: 5.0,
        },
        {
          id: 2,
          address: '9355 westering sun dr',
          formattedAddress: '9355 Westering Sun Dr',
          city: 'Columbia',
          state: 'MD',
          zipCode: '21045',
          score: 3.0,
        },
      ];
      mockPropertyDbService.autocompleteProperties.mockResolvedValue(
        mockResults,
      );

      const result = await service.autocompleteProperty('9354 we');

      expect(result).toHaveLength(2);
      expect(result[0].address).toBe('9354 westering sun dr');
      expect(result[1].address).toBe('9355 westering sun dr');
    });
  });
});
