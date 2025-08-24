# Property Information Search App

A Next.js application that allows users to search for property information by address using the RentCast API.

## Features

- Search properties by address
- Display comprehensive property information including:
  - Owner information
  - Property details (year built, square footage, etc.)
  - Location and structure information
  - Property valuation data
  - Transfer/sale history
- Search history with Previous button functionality
- Clean, professional UI matching the provided design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure RentCast API:
   - Your API key is already configured in `.env.local`
   - If you need to update it, edit the `.env.local` file

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a property address in the search field (e.g., "9354 WESTERING SUN, COLUMBIA MD 21045")
2. Click "Search Property" to fetch information
3. View the detailed property information displayed
4. Use "New Search" to search for another property
5. Use "Previous" to go back to previously searched properties

## Technologies Used

- Next.js 15.5.0 with App Router
- TypeScript
- Tailwind CSS
- RentCast API for property data
- Axios for API calls

## API Integration

The app integrates with RentCast API v1 to fetch property data. The API provides:
- Property attributes and characteristics
- Owner information
- Assessment and tax data
- Sale history
- Location details

## Project Structure

```
property-search/
├── app/
│   ├── api/
│   │   └── property/
│   │       └── route.ts      # API endpoint for property search
│   ├── globals.css           # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with search logic
├── components/
│   ├── PropertySearch.tsx   # Search form component
│   └── PropertyInfo.tsx     # Property information display
├── .env.local               # Environment variables (API keys)
└── package.json
```
