'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AutocompleteSuggestion {
  id: number;
  address: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  score: number;
}

interface PropertySearchProps {
  onSearch: (address: string) => void;
  loading: boolean;
  error: string | null;
}

export default function PropertySearch({ onSearch, loading, error }: PropertySearchProps) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '5' });
      const response = await fetch(`${apiUrl}/api/property/autocomplete?${params}`);
      if (response.ok) {
        const data: AutocompleteSuggestion[] = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      }
    } catch {
      // Silently fail — autocomplete is a convenience, not critical
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [apiUrl]);

  const handleInputChange = (value: string) => {
    setAddress(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    const displayAddress = suggestion.formattedAddress || suggestion.address;
    setAddress(displayAddress);
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch(displayAddress);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      onSearch(address.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const formatSuggestionDisplay = (s: AutocompleteSuggestion) => {
    const parts = [s.formattedAddress || s.address];
    if (!s.formattedAddress) {
      const extra = [s.city, s.state, s.zipCode].filter(Boolean).join(', ');
      if (extra) parts.push(extra);
    }
    return parts.join(', ');
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
            <div className="flex gap-2" ref={wrapperRef}>
              <div className="relative flex-1">
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="11760 Baltimore Ave, Beltsville, MD 20705"
                  className="w-full px-4 py-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls="address-suggestions"
                  aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    id="address-suggestions"
                    role="listbox"
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={suggestion.id}
                        id={`suggestion-${index}`}
                        role="option"
                        aria-selected={index === selectedIndex}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          index === selectedIndex
                            ? 'bg-blue-50 text-blue-800'
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseDown={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="text-sm font-medium text-gray-800">
                          {formatSuggestionDisplay(suggestion)}
                        </div>
                        {suggestion.city && suggestion.state && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {[suggestion.city, suggestion.state, suggestion.zipCode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
            <li>Start typing to see address suggestions</li>
            <li>Typos and abbreviations (St, Ave, Rd) are handled automatically</li>
            <li>Include ZIP code for more accurate results</li>
            <li>Property data is retrieved from public records</li>
          </ul>
        </div>
      </div>
    </div>
  );
}