import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyDbService } from '../property-db.service';

const mockFindFirst = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockReturnValue({
    onConflictDoUpdate: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    }),
  }),
});
const mockDelete = vi.fn().mockReturnValue({
  where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
});
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockResolvedValue([{ totalProperties: 5, avgAccessCount: 3, oldestEntry: new Date(), newestEntry: new Date() }]),
});
const mockExecute = vi.fn();

const mockDb = {
  query: {
    properties: {
      findFirst: mockFindFirst,
    },
  },
  update: mockUpdate,
  insert: mockInsert,
  delete: mockDelete,
  select: mockSelect,
  execute: mockExecute,
} as any;

const mockAddressParser = {
  parseAddress: vi.fn().mockReturnValue({
    streetAddress: '123 main st',
    city: 'FREDERICK',
    state: 'MD',
    zip: '21704',
    fullAddress: '123 main st frederick md 21704',
  }),
  tokenizeSearchInput: vi.fn().mockReturnValue([]),
  classifyToken: vi.fn().mockReturnValue('word'),
  expandAbbreviations: vi.fn().mockImplementation((t: string) => [t]),
};

let service: PropertyDbService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new PropertyDbService(mockDb, mockAddressParser as any);
});

describe('PropertyDbService - getPropertyFromDB', () => {
  it('returns null when no property found', async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await service.getPropertyFromDB('123 main st frederick md');
    expect(result).toBeNull();
  });

  it('returns data and updates access tracking when property found', async () => {
    const mockProp = {
      id: 1,
      address: '123 main st',
      city: 'FREDERICK',
      state: 'MD',
      zipCode: '21704',
      updatedAt: new Date(),
      taxAssessments: [],
      propertyTaxes: [],
      saleHistory: [],
    };
    mockFindFirst.mockResolvedValue(mockProp);

    const result = await service.getPropertyFromDB('123 main st frederick md');
    expect(result).not.toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data.address).toBe('123 main st');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('falls back to street-only match when full match fails', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 2,
        address: '123 main st',
        updatedAt: new Date(),
        taxAssessments: [],
        propertyTaxes: [],
        saleHistory: [],
      });

    const result = await service.getPropertyFromDB('123 main st frederick md');
    expect(result).not.toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(2);
  });

  it('returns null on database error', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB connection failed'));
    const result = await service.getPropertyFromDB('123 main st');
    expect(result).toBeNull();
  });
});

describe('PropertyDbService - savePropertyToDB', () => {
  it('saves property and related records', async () => {
    const propertyData = {
      address: '123 Main St',
      city: 'Frederick',
      state: 'MD',
      zipCode: '21704',
      taxAssessments: { '2024': { land: 100000, improvements: 200000, value: 300000 } },
      propertyTaxes: { '2024': { total: 5000 } },
      history: [{ date: '2020-01-01', price: 300000, seller: 'John Doe' }],
    };

    const result = await service.savePropertyToDB('123 main st', propertyData, { id: 'rc-123' });
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('saves property without related records when empty', async () => {
    const propertyData = { address: '123 Main St' };
    const result = await service.savePropertyToDB('123 main st', propertyData);
    expect(result).toBe(true);
  });

  it('returns false on database error', async () => {
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    });
    const result = await service.savePropertyToDB('123 main st', {});
    expect(result).toBe(false);
  });
});

describe('PropertyDbService - cleanupStaleCache', () => {
  it('returns count of deleted properties', async () => {
    mockDelete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      }),
    });
    const result = await service.cleanupStaleCache(90);
    expect(result).toBe(2);
  });

  it('returns 0 on error', async () => {
    mockDelete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    });
    const result = await service.cleanupStaleCache();
    expect(result).toBe(0);
  });
});

describe('PropertyDbService - getCacheStats', () => {
  it('returns cache statistics', async () => {
    const result = await service.getCacheStats();
    expect(result).not.toBeNull();
    expect(result?.totalProperties).toBe(5);
  });

  it('returns null on error', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockRejectedValue(new Error('DB error')),
    });
    const result = await service.getCacheStats();
    expect(result).toBeNull();
  });
});
