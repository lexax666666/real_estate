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
  onSearch: (address: string) => Promise<any>;
}

const TIPS = [
  { num: "01", title: "Full street address", body: "Include the house number, street name, and unit if applicable." },
  { num: "02", title: "Use ZIP for accuracy", body: "Adding the ZIP code disambiguates common street names across neighboring areas." },
  { num: "03", title: "Public record only", body: "Data surfaces from recorded deeds and periodic assessments. Some parcels may be incomplete." },
  { num: "04", title: "Autocomplete available", body: "Start typing and select from suggested addresses for the most accurate results." },
];

export default function PropertySearch({ onSearch }: PropertySearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLFormElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({ q, limit: '5' });
      const response = await fetch(`${apiUrl}/api/property/autocomplete?${params}`);
      if (response.ok) {
        const data: AutocompleteSuggestion[] = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      }
    } catch {
      // Autocomplete is a convenience, not critical
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [apiUrl]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const doSearch = async (address: string) => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      await onSearch(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    const displayAddress = suggestion.formattedAddress || suggestion.address;
    setQuery(displayAddress);
    doSearch(displayAddress);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      doSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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
    <>
      <section className="center-section" id="center-search">
        <div className="center-section-inner">
          <div className="center-card">
            <h2 className="center-card-title">Property Data Search</h2>
            <div className="welcome-banner">
              <strong>Welcome to Property Search.</strong> This application lets you look up property information by entering a street address. Data is compiled from public records and refreshed periodically.
            </div>
            <label className="center-label" htmlFor="center-addr">Property Address</label>
            <form className="center-row" onSubmit={handleSubmit} ref={wrapperRef}>
              <div className="center-input-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <input
                  id="center-addr"
                  className="center-input"
                  placeholder="e.g. 123 Main St, Anytown 12345"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  aria-label="Property address"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls="address-suggestions"
                  aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
                  disabled={loading}
                />
                {isLoadingSuggestions && (
                  <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="autocomplete-dropdown" id="address-suggestions" role="listbox">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.id}
                        id={`suggestion-${index}`}
                        role="option"
                        aria-selected={index === selectedIndex}
                        className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                        onMouseDown={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="autocomplete-item-address">
                          {formatSuggestionDisplay(suggestion)}
                        </div>
                        {suggestion.city && suggestion.state && (
                          <div className="autocomplete-item-meta">
                            {[suggestion.city, suggestion.state, suggestion.zipCode].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="center-submit" disabled={loading || !query.trim()}>
                {loading ? 'Searching\u2026' : 'Search'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </form>

            {error && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#FFF0F0', borderLeft: '4px solid var(--red)', fontSize: 14 }}>
                {error}
              </div>
            )}

            <hr className="center-divider" />
            <div className="center-tips-title">Search Tips:</div>
            <ul className="center-tips">
              <li>Enter the complete street address including city and state</li>
              <li>Include ZIP code for more accurate results</li>
              <li>Property data is retrieved from public records</li>
              <li>Start typing to see address suggestions from the database</li>
              <li>If an exact address is not found, try a similar address format</li>
            </ul>
            <div className="center-card-meta">
              <span>Form · A-02 · Public records index</span>
              <span>PropLookup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tips grid */}
      <div className="main-content">
        <div className="section-head">
          <h2 className="section-title"><span className="num">01</span>Search tips</h2>
          <span className="section-meta">How to get a match</span>
        </div>
        <div className="tips-grid">
          {TIPS.map(t => (
            <div key={t.num} className="tip">
              <div className="tip-num">— Tip {t.num}</div>
              <div>
                <div className="tip-title">{t.title}</div>
                <div className="tip-body">{t.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
