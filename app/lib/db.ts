import { sql } from '@vercel/postgres';

export interface PropertyCacheEntry {
  id: number;
  address: string;
  property_data: any;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
  access_count: number;
}

/**
 * Get a property from the database cache by address
 * Also updates the last_accessed_at timestamp and access_count
 */
export async function getPropertyFromDB(address: string): Promise<any | null> {
  try {
    // Normalize address for consistent lookups
    const normalizedAddress = address.trim().toLowerCase();

    const result = await sql<PropertyCacheEntry>`
      UPDATE properties
      SET last_accessed_at = CURRENT_TIMESTAMP,
          access_count = access_count + 1
      WHERE LOWER(address) = ${normalizedAddress}
      RETURNING property_data, updated_at
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      data: row.property_data,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error fetching property from database:', error);
    return null;
  }
}

/**
 * Save or update a property in the database cache
 */
export async function savePropertyToDB(
  address: string,
  propertyData: any
): Promise<boolean> {
  try {
    // Normalize address for consistent storage
    const normalizedAddress = address.trim().toLowerCase();

    await sql`
      INSERT INTO properties (address, property_data, access_count)
      VALUES (${normalizedAddress}, ${JSON.stringify(propertyData)}, 1)
      ON CONFLICT (address)
      DO UPDATE SET
        property_data = ${JSON.stringify(propertyData)},
        updated_at = CURRENT_TIMESTAMP,
        last_accessed_at = CURRENT_TIMESTAMP,
        access_count = properties.access_count + 1
    `;

    return true;
  } catch (error) {
    console.error('Error saving property to database:', error);
    return false;
  }
}

/**
 * Check if cached data is still fresh
 * @param updatedAt - The timestamp when the data was last updated
 * @param maxAgeHours - Maximum age in hours before data is considered stale (default: 24 hours)
 */
export function isCacheFresh(updatedAt: Date, maxAgeHours: number = 24): boolean {
  const now = new Date();
  const cacheAge = now.getTime() - new Date(updatedAt).getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return cacheAge < maxAgeMs;
}

/**
 * Delete stale cache entries older than specified days
 * Useful for cleaning up old data
 */
export async function cleanupStaleCache(olderThanDays: number = 90): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM properties
      WHERE updated_at < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `;

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up stale cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalProperties: number;
  avgAccessCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} | null> {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total_properties,
        AVG(access_count) as avg_access_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
      FROM properties
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      totalProperties: parseInt(row.total_properties as string),
      avgAccessCount: parseFloat(row.avg_access_count as string),
      oldestEntry: row.oldest_entry as Date,
      newestEntry: row.newest_entry as Date,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}
