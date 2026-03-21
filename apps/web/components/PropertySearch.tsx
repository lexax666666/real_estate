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
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Real Property Data Search
        </h2>
        
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Welcome to Real Property Search!</strong> This application allows you to search for property information by entering a street address.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
              Property Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="11760 Baltimore Ave, Beltsville, MD 20705"
                className="flex-1 px-4 py-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3">Search Tips:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Enter the complete street address including city and state</li>
            <li>Include ZIP code for more accurate results</li>
            <li>Property data is retrieved from public records</li>
            <li>Some properties may have limited information available</li>
          </ul>
        </div>
      </div>
    </div>
  );
}