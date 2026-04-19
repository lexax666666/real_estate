'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertySearch from '@/components/PropertySearch';
import PropertyInfo from '@/components/PropertyInfo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function HomeContent() {
  const [query, setQuery] = useState('');
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [isNavigatingToPrevious, setIsNavigatingToPrevious] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const address = searchParams.get('address');
    if (address && !isNavigatingToPrevious) {
      setQuery(address);
      handleSearch(address);
    } else if (!address) {
      setPropertyData(null);
      setError(null);
    }
    if (isNavigatingToPrevious) {
      setIsNavigatingToPrevious(false);
    }
  }, [searchParams, isNavigatingToPrevious]);

  const handleSearch = async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ address });
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/property?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const data = await response.json();
      setPropertyData(data);
      setSearchHistory(prev => [data, ...prev.slice(0, 9)]);
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
    setQuery('');
    router.push('/', { scroll: false });
  };

  const handlePreviousSearch = () => {
    if (searchHistory.length > 1) {
      const previousData = searchHistory[1];
      setIsNavigatingToPrevious(true);
      setPropertyData(previousData);
      setSearchHistory(prev => [previousData, ...prev.filter((_, i) => i !== 1)]);
      if (previousData.address) {
        router.push(`?address=${encodeURIComponent(previousData.address)}`, { scroll: false });
      }
    }
  };

  const handleSubmitFromHero = () => {
    if (query.trim()) {
      handleSearch(query.trim());
    }
  };

  return (
    <>
      <Header
        query={query}
        setQuery={setQuery}
        onSubmit={handleSubmitFromHero}
        loading={loading}
      />
      <PropertySearch
        query={query}
        setQuery={setQuery}
        onSearch={handleSearch}
        loading={loading}
        error={error}
      />

      {/* Loading state */}
      {loading && (
        <div className="main-content">
          <div className="results-panel" style={{ marginTop: 0 }}>
            <div className="loading-state">
              Retrieving property record <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {propertyData && !loading && (
        <PropertyInfo
          data={propertyData}
          onNewSearch={handleNewSearch}
          onPreviousSearch={handlePreviousSearch}
          hasPrevious={searchHistory.length > 1}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={<div className="loading-state">Loading<span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>}>
        <HomeContent />
      </Suspense>
      <Footer />
    </div>
  );
}
