'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertyInfo from '@/components/PropertyInfo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function PropertyContent() {
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchProperty = async (address: string) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const address = searchParams.get('address');
    if (address) {
      fetchProperty(address);
    }
  }, [searchParams]);

  const handleNewSearch = () => {
    router.push('/');
  };

  const handlePreviousSearch = () => {
    if (searchHistory.length > 1) {
      const previousData = searchHistory[1];
      setPropertyData(previousData);
      setSearchHistory(prev => [previousData, ...prev.filter((_, i) => i !== 1)]);
      if (previousData.address) {
        router.push(`/property?address=${encodeURIComponent(previousData.address)}`, { scroll: false });
      }
    }
  };

  // Search from the minimal header navigates to same page with new address
  const handleHeaderSearch = async (address: string) => {
    router.push(`/property?address=${encodeURIComponent(address)}`);
  };

  return (
    <>
      <Header onSearch={handleHeaderSearch} minimal />

      <main className="flex-1" style={{ padding: '0 16px 40px', background: 'var(--paper)' }}>
        {loading && (
          <div className="max-w-7xl mx-auto mt-8">
            <div className="results-panel">
              <div className="loading-state">
                Retrieving property record <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-7xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div style={{ padding: '12px 16px', background: '#FFF0F0', borderLeft: '4px solid var(--red)', fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
              <button
                onClick={handleNewSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}

        {propertyData && !loading && (
          <PropertyInfo
            data={propertyData}
            onNewSearch={handleNewSearch}
            onPreviousSearch={handlePreviousSearch}
            hasPrevious={searchHistory.length > 1}
          />
        )}
      </main>
    </>
  );
}

export default function PropertyPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={<div className="loading-state">Loading<span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>}>
        <PropertyContent />
      </Suspense>
      <Footer />
    </div>
  );
}
