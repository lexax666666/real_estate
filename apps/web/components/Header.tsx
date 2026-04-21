'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, useEffect } from 'react';

interface AutocompleteSuggestion {
  id: number;
  address: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  score: number;
}

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <rect x="0" y="0" width="40" height="40" fill="#1a1a1a"/>
      <rect x="2" y="2" width="36" height="36" fill="#FFC928"/>
      <path d="M20 8 L28 16 L28 32 L24 32 L24 22 L16 22 L16 32 L12 32 L12 16 Z" fill="#1a1a1a"/>
      <circle cx="20" cy="15" r="2.5" fill="#C8102E"/>
    </svg>
  );
}

function HeroGraphic() {
  return (
    <svg viewBox="0 0 380 380" aria-hidden="true">
      <defs>
        <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="8" fill="#FFC928" opacity="0.5"/>
        </pattern>
      </defs>
      <g stroke="#FAFAF7" strokeWidth="1.5" fill="none" opacity="0.35">
        <line x1="0" y1="80" x2="380" y2="80"/>
        <line x1="0" y1="160" x2="380" y2="160"/>
        <line x1="0" y1="240" x2="380" y2="240"/>
        <line x1="0" y1="320" x2="380" y2="320"/>
        <line x1="80" y1="0" x2="80" y2="380"/>
        <line x1="160" y1="0" x2="160" y2="380"/>
        <line x1="240" y1="0" x2="240" y2="380"/>
        <line x1="320" y1="0" x2="320" y2="380"/>
      </g>
      <rect x="80" y="80" width="160" height="80" fill="#C8102E"/>
      <rect x="240" y="80" width="80" height="160" fill="#FFC928"/>
      <rect x="80" y="160" width="80" height="80" fill="url(#stripes)" stroke="#FFC928" strokeWidth="1"/>
      <rect x="160" y="240" width="160" height="80" fill="#FAFAF7"/>
      <rect x="80" y="80" width="240" height="240" fill="none" stroke="#FFC928" strokeWidth="3"/>
      <g transform="translate(190, 180)">
        <circle r="44" fill="#1a1a1a" opacity="0.25"/>
        <path d="M0 -40 C 18 -40, 30 -26, 30 -10 C 30 10, 0 36, 0 36 C 0 36, -30 10, -30 -10 C -30 -26, -18 -40, 0 -40 Z"
              fill="#C8102E" stroke="#1a1a1a" strokeWidth="3"/>
        <circle cx="0" cy="-12" r="8" fill="#FAFAF7"/>
      </g>
      <text x="12" y="370" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#FAFAF7" opacity="0.6">
        PARCEL · PUBLIC INDEX
      </text>
      <text x="270" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#FFC928">
        RECORDS
      </text>
    </svg>
  );
}

interface HeaderProps {
  onSearch: (address: string) => Promise<any>;
  minimal?: boolean;
}

export default function Header({ onSearch, minimal }: HeaderProps) {
  const [heroQuery, setHeroQuery] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    setHeroQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const doSearch = async (address: string) => {
    setHeroLoading(true);
    setHeroError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      await onSearch(address);
    } catch (err) {
      setHeroError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setHeroLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    const displayAddress = suggestion.formattedAddress || suggestion.address;
    setHeroQuery(displayAddress);
    doSearch(displayAddress);
  };

  const handleHeroSubmit = async () => {
    if (!heroQuery.trim()) return;
    doSearch(heroQuery.trim());
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
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
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
      {/* Ribbon */}
      <div className="ribbon">
        <div className="ribbon-inner">
          <div className="ribbon-left">
            <span className="ribbon-dot" />
            <span>Public records search · independent property data tool</span>
          </div>
          <div className="mono" style={{fontSize: 11, letterSpacing: '0.08em', opacity: 0.85}}>
            PROPLOOKUP
          </div>
        </div>
      </div>

      {/* Site header */}
      <header className="site">
        <div className="header-inner">
          <Link href="/" className="brand">
            <div className="brand-mark"><BrandMark /></div>
            <div>
              <div className="brand-name">PropLookup<span className="dot">.</span></div>
              <div className="brand-sub">Property Records Search</div>
            </div>
          </Link>
          <div className="header-meta mono">
            <span className="header-meta-dot" />
            Public records · Open access
          </div>
        </div>
      </header>

      {/* Hero — hidden on minimal (property detail) pages */}
      {!minimal && <section className="hero">
        <div className="hero-bg" />
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">Public Records · Open Access</div>
            <h1>
              Find a property&apos;s <span className="underline-text">assessment</span>,<br/>
              <span className="accent">ownership &amp; lot details</span> by address.
            </h1>
            <p className="hero-lede">
              Search any parcel in the public records index. Enter a full street address to view assessed value, building characteristics, and valuation history — no account required.
            </p>
            <form className="search-card" ref={formRef} onSubmit={(e) => { e.preventDefault(); handleHeroSubmit(); }}>
              <div className="search-card-head">
                <div className="search-card-title">Property Data Search</div>
                <div className="search-card-meta">Form · A-01</div>
              </div>
              <div className="search-label">
                <span>Property Address</span>
                <span><span className="req">*</span> Required</span>
              </div>
              <div className="search-row" style={{ position: 'relative' }}>
                <div className="search-input-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <input
                    ref={inputRef}
                    className="search-input"
                    placeholder="Enter a street address, e.g. 123 Main St"
                    value={heroQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    aria-label="Property address"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showSuggestions}
                    aria-controls="hero-suggestions"
                    aria-activedescendant={selectedIndex >= 0 ? `hero-suggestion-${selectedIndex}` : undefined}
                    disabled={heroLoading}
                  />
                  {isLoadingSuggestions && (
                    <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    </div>
                  )}
                </div>
                <button type="submit" className="search-submit" disabled={heroLoading || !heroQuery.trim()}>
                  {heroLoading ? 'Searching\u2026' : 'Search'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="autocomplete-dropdown" id="hero-suggestions" role="listbox">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.id}
                        id={`hero-suggestion-${index}`}
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
              {heroError && (
                <div className="search-error" style={{ marginTop: 14, padding: '10px 14px', background: '#FFF0F0', borderLeft: '4px solid var(--red)', fontSize: 13 }}>
                  {heroError}
                </div>
              )}
            </form>
          </div>
          <div className="hero-graphic">
            <HeroGraphic />
          </div>
        </div>
      </section>}
    </>
  );
}
