'use client';

import { useState } from 'react';
import PropertySearch from '@/components/PropertySearch';
import PropertyInfo from '@/components/PropertyInfo';

export default function Home() {
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  const handleSearch = async (address: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const data = await response.json();
      setPropertyData(data);
      setSearchHistory(prev => [data, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    setPropertyData(null);
    setError(null);
  };

  const handlePreviousSearch = () => {
    if (searchHistory.length > 1) {
      const previousData = searchHistory[1];
      setPropertyData(previousData);
      setSearchHistory(prev => [previousData, ...prev.filter((_, i) => i !== 1)]);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {!propertyData ? (
          <PropertySearch onSearch={handleSearch} loading={loading} error={error} />
        ) : (
          <PropertyInfo 
            data={propertyData} 
            onNewSearch={handleNewSearch}
            onPreviousSearch={handlePreviousSearch}
            hasPrevious={searchHistory.length > 1}
          />
        )}
      </div>
    </main>
  );
}
