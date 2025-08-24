'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertySearch from '@/components/PropertySearch';
import PropertyInfo from '@/components/PropertyInfo';

export default function Home() {
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const address = searchParams.get('address');
    if (address) {
      handleSearch(address);
    }
  }, [searchParams]);

  const handleSearch = async (address: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ address });
      const response = await fetch(`/api/property?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const data = await response.json();
      setPropertyData(data);
      setSearchHistory(prev => [data, ...prev.slice(0, 9)]);
      
      // Update URL with address
      router.push(`?address=${encodeURIComponent(address)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    setPropertyData(null);
    setError(null);
    router.push('/', { scroll: false });
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
