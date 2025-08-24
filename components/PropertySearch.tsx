'use client';

import { useState } from 'react';

interface PropertySearchProps {
  onSearch: (address: string) => void;
  loading: boolean;
  error: string | null;
}

export default function PropertySearch({ onSearch, loading, error }: PropertySearchProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        Property Information Search
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Property Address
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 9354 WESTERING SUN, COLUMBIA MD 21045"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="w-full bg-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search Property'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}