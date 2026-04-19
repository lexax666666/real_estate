'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertySearch from '@/components/PropertySearch';
import PropertyInfo from '@/components/PropertyInfo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function HomeContent() {
  const [propertyData, setPropertyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [isNavigatingToPrevious, setIsNavigatingToPrevious] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Core fetch logic — returns data or throws. Does NOT manage loading/error state.
  const fetchProperty = useCallback(async (address: string) => {
    const params = new URLSearchParams({ address });
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/api/property?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch property data');
    }

    return response.json();
  }, []);

  // Called by Header and PropertySearch — each manages its own loading/error around this
  const handleSearch = useCallback(async (address: string) => {
    setIsSearching(true);
    try {
      const data = await fetchProperty(address);
      setPropertyData(data);
      setSearchHistory(prev => [data, ...prev.slice(0, 9)]);
      router.push(`?address=${encodeURIComponent(address)}`, { scroll: false });
      return data;
    } finally {
      setIsSearching(false);
    }
  }, [fetchProperty, router]);

  useEffect(() => {
    const address = searchParams.get('address');
    if (address && !isNavigatingToPrevious) {
      handleSearch(address).catch(() => {});
    } else if (!address) {
      setPropertyData(null);
    }
    if (isNavigatingToPrevious) {
      setIsNavigatingToPrevious(false);
    }
  }, [searchParams, isNavigatingToPrevious]);

  const handleNewSearch = () => {
    setPropertyData(null);
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

  return (
    <>
      <Header onSearch={handleSearch} />
      <PropertySearch onSearch={handleSearch} />

      {/* Global loading indicator */}
      {isSearching && (
        <div className="main-content">
          <div className="results-panel" style={{ marginTop: 0 }}>
            <div className="loading-state">
              Retrieving property record <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {propertyData && !isSearching && (
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
