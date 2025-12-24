# Vercel Postgres Setup Guide

This guide will walk you through setting up Vercel Postgres for caching property data from the RentCast API.

## Prerequisites

- A Vercel account (free tier is fine)
- Your project deployed to Vercel OR Vercel CLI installed for local development

## Step 1: Create Vercel Postgres Database

### Option A: Via Vercel Dashboard (Easiest)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create/import this project)
3. Navigate to the **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Configure your database:
   - **Database Name**: `property-search-db` (or your preferred name)
   - **Region**: Choose closest to your target users (e.g., `us-east-1`)
7. Click **Create & Continue**
8. Vercel will automatically add environment variables to your project

### Option B: Via Vercel CLI

```bash
vercel storage create postgres property-search-db --region us-east-1
```

## Step 2: Pull Environment Variables Locally

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Link your project
vercel link

# Pull environment variables to .env.local
vercel env pull .env.local
```

This will download all Postgres connection strings to `.env.local` including:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_URL_NON_POOLING`
- And other credentials

## Step 3: Initialize Database Schema

You need to create the `properties` table in your database.

### Option A: Via Vercel Postgres Dashboard

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → Select your Postgres database
3. Click on the **Query** tab
4. Copy the entire contents of `app/lib/schema.sql`
5. Paste into the query editor
6. Click **Run Query**

### Option B: Via Command Line (using psql)

```bash
# First, get your connection string
vercel env pull .env.local

# Connect using psql (you'll need PostgreSQL client installed)
# Extract POSTGRES_URL from .env.local and run:
psql "your-postgres-url-here" < app/lib/schema.sql
```

### Option C: Via Node.js Script

Create a script `scripts/init-db.js`:

```javascript
const { sql } = require('@vercel/postgres');
const fs = require('fs');

async function initDB() {
  const schema = fs.readFileSync('./app/lib/schema.sql', 'utf8');
  await sql.query(schema);
  console.log('Database initialized successfully!');
}

initDB().catch(console.error);
```

Then run:
```bash
node scripts/init-db.js
```

## Step 4: Verify Setup

Test your database connection:

```bash
# Start your development server
npm run dev

# Make a request to your API
curl "http://localhost:3000/api/property?address=123%20Main%20St"
```

Check your console logs - you should see:
- "Checking database cache for: 123 Main St"
- "No cache found, fetching from API" (first request)
- "Saving property data to database"
- "Returning cached property data" (subsequent requests)

## Step 5: Deploy to Vercel

```bash
# Commit your changes
git add .
git commit -m "Add Vercel Postgres caching"

# Deploy
vercel --prod
```

The database environment variables are automatically available in production!

## Database Schema

The `properties` table stores:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `address` | TEXT | Normalized address (unique index) |
| `property_data` | JSONB | Full RentCast API response |
| `created_at` | TIMESTAMP | When first cached |
| `updated_at` | TIMESTAMP | Last update time |
| `last_accessed_at` | TIMESTAMP | Last access time |
| `access_count` | INTEGER | Number of times accessed |

## Cache Behavior

- **Cache Duration**: 24 hours (configurable in `app/lib/db.ts`)
- **First Request**: Fetches from RentCast API → Saves to DB → Returns data
- **Subsequent Requests (< 24h)**: Returns from DB cache
- **Stale Requests (> 24h)**: Fetches fresh data → Updates DB → Returns data

## Monitoring & Maintenance

### View Cached Properties

In Vercel Dashboard → Storage → Your Postgres DB → Query tab:

```sql
-- See all cached properties
SELECT address, created_at, updated_at, access_count
FROM properties
ORDER BY access_count DESC;

-- Get cache statistics
SELECT
  COUNT(*) as total_properties,
  AVG(access_count) as avg_access_count,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM properties;
```

### Cleanup Old Entries

The `app/lib/db.ts` includes a `cleanupStaleCache()` function:

```typescript
// Delete entries older than 90 days
await cleanupStaleCache(90);
```

You can create a cron job or API endpoint to run this periodically.

## Cost Estimates

**Vercel Postgres Free Tier:**
- 256 MB storage (~1,000-5,000 properties depending on data size)
- 60 hours of compute per month
- 256 MB RAM

**Typical Usage:**
- Each property entry: ~10-50 KB (depending on history/assessments)
- 1,000 properties ≈ 10-50 MB
- You can easily fit thousands of properties in the free tier

**When to Upgrade:**
- If you exceed storage or compute limits
- Pro plan: $10/month (more compute + storage)

## Troubleshooting

### "relation 'properties' does not exist"
→ You haven't run the schema.sql. Go to Step 3.

### "connect ECONNREFUSED"
→ Make sure you've pulled environment variables: `vercel env pull .env.local`

### "permission denied for schema public"
→ Database user doesn't have permissions. This shouldn't happen with Vercel Postgres.

### Database not updating
→ Check `isCacheFresh()` settings in `app/lib/db.ts` - default is 24 hours

## Next Steps

Consider adding:
- **Redis caching** for even faster responses (in-memory cache)
- **Cache invalidation API** to manually refresh specific properties
- **Analytics endpoint** using `getCacheStats()`
- **Scheduled cleanup** using Vercel Cron Jobs

## Support

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [RentCast API Docs](https://developers.rentcast.io/)
