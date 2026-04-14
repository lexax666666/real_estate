-- Enable ParadeDB pg_search extension for BM25 full-text search
CREATE EXTENSION IF NOT EXISTS pg_search;

-- Create BM25 index on properties table for fuzzy address search
-- key_field must be listed first and have a UNIQUE constraint (id is PRIMARY KEY)
CREATE INDEX properties_bm25_idx ON properties
USING bm25 (id, address, formatted_address, city, state, zip_code)
WITH (key_field = 'id');
