-- Properties table for caching RentCast API responses
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  property_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1
);

-- Index for faster address lookups
CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);

-- Index for finding stale cache entries
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at);

-- Index for querying within JSONB data (optional - add as needed)
-- CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties USING GIN ((property_data->'propertyType'));
-- CREATE INDEX IF NOT EXISTS idx_properties_city ON properties USING GIN ((property_data->'city'));

-- Function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on any update
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
