'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import PropertySearch from '@/components/PropertySearch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function HomeContent() {
  const router = useRouter();

  const handleSearch = async (address: string) => {
    router.push(`/property?address=${encodeURIComponent(address)}`);
  };

  return (
    <>
      <Header onSearch={handleSearch} />
      <PropertySearch onSearch={handleSearch} />
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
