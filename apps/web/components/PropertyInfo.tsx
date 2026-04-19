'use client';

interface PropertyInfoProps {
  data: any;
  onNewSearch: () => void;
  onPreviousSearch: () => void;
  hasPrevious: boolean;
}

function currency(n: number) {
  return '$' + n.toLocaleString('en-US');
}

function formatDate(date: string) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US');
}

function MapPlaceholder() {
  return (
    <div className="map-ph">
      <svg className="map-roads" viewBox="0 0 400 300" preserveAspectRatio="none">
        <path d="M0 180 L400 120" stroke="#1a1a1a" strokeWidth="6" opacity="0.85"/>
        <path d="M0 180 L400 120" stroke="#FFC928" strokeWidth="2" strokeDasharray="6 6"/>
        <path d="M120 0 L180 300" stroke="#1a1a1a" strokeWidth="4" opacity="0.7"/>
        <path d="M280 0 L220 300" stroke="#1a1a1a" strokeWidth="4" opacity="0.7"/>
        <path d="M0 60 C 80 80, 160 40, 240 90 S 360 130, 400 110" stroke="#1a1a1a" strokeWidth="2" opacity="0.3" fill="none"/>
        <rect x="175" y="130" width="50" height="42" fill="#C8102E" opacity="0.15" stroke="#C8102E" strokeWidth="1.5" strokeDasharray="3 3"/>
      </svg>
      <svg className="map-pin" viewBox="0 0 40 50" width="36" height="45">
        <path d="M20 2 C 30 2, 38 10, 38 20 C 38 32, 20 48, 20 48 C 20 48, 2 32, 2 20 C 2 10, 10 2, 20 2 Z"
              fill="#C8102E" stroke="#1a1a1a" strokeWidth="2"/>
        <circle cx="20" cy="20" r="6" fill="#FAFAF7"/>
      </svg>
      <div className="map-scale">0 ——— 150 ft</div>
    </div>
  );
}

export default function PropertyInfo({ data, onNewSearch, onPreviousSearch, hasPrevious }: PropertyInfoProps) {
  const address = data.formattedAddress || data.address || 'Unknown Address';
  const fullAddress = [address, data.city, data.state, data.zipCode].filter(Boolean).join(', ');

  // Assessment values
  const totalAssessed = data.assessedValue?.total || data.lastSalePrice || 0;
  const landValue = data.assessedValue?.land || 0;
  const improvementValue = data.assessedValue?.building || 0;

  return (
    <div className="main-content">
      <div className="section-head" style={{ marginTop: 0 }}>
        <h2 className="section-title"><span className="num">02</span>Result</h2>
        <span className="section-meta">1 record · public data</span>
      </div>

      <div className="results-panel">
        {/* Banner */}
        <div className="results-banner">
          <div className="results-banner-left">
            <span className="results-pill">MATCH</span>
            <span className="results-addr">{fullAddress}</span>
          </div>
          <button className="results-close" onClick={onNewSearch}>× New search</button>
        </div>

        <div className="results-grid">
          {/* Main content */}
          <div className="res-main">
            {/* Assessment block */}
            {totalAssessed > 0 && (
              <div className="assessment-block">
                <div className="assessment-label">Total Assessed Value</div>
                <div className="assessment-value">{currency(totalAssessed)}</div>
              </div>
            )}

            {/* Property Details */}
            <div className="section-head" style={{ marginTop: 32, borderBottomColor: '#e5e2d8', paddingBottom: 8 }}>
              <h3 className="section-title" style={{ fontSize: 18 }}>Property Details</h3>
              <span className="section-meta">Section A</span>
            </div>
            <div className="kvlist">
              <div className="kv-k">Owner</div>
              <div className="kv-v">{data.ownerName || 'N/A'}</div>

              <div className="kv-k">Address</div>
              <div className="kv-v">{address}</div>

              <div className="kv-k">City / State</div>
              <div className="kv-v">{[data.city, data.state, data.zipCode].filter(Boolean).join(', ') || 'N/A'}</div>

              <div className="kv-k">Property Type</div>
              <div className="kv-v">{data.propertyType || 'N/A'}</div>

              {data.zoning && (
                <>
                  <div className="kv-k">Zoning</div>
                  <div className="kv-v mono">{data.zoning}</div>
                </>
              )}

              {data.neighborhood && (
                <>
                  <div className="kv-k">Neighborhood</div>
                  <div className="kv-v">{data.neighborhood}</div>
                </>
              )}

              {data.subdivision && (
                <>
                  <div className="kv-k">Subdivision</div>
                  <div className="kv-v">{data.subdivision}</div>
                </>
              )}

              {data.lastSalePrice && (
                <>
                  <div className="kv-k">Last Sale</div>
                  <div className="kv-v accent">
                    {currency(data.lastSalePrice)}
                    {data.lastSaleDate ? ` · ${formatDate(data.lastSaleDate)}` : ''}
                  </div>
                </>
              )}
            </div>

            {/* Value breakdown if available */}
            {(landValue > 0 || improvementValue > 0) && (
              <>
                <div className="section-head" style={{ marginTop: 32, borderBottomColor: '#e5e2d8', paddingBottom: 8 }}>
                  <h3 className="section-title" style={{ fontSize: 18 }}>Value Breakdown</h3>
                  <span className="section-meta">Section B</span>
                </div>
                <div className="kvlist">
                  {landValue > 0 && (
                    <>
                      <div className="kv-k">Land</div>
                      <div className="kv-v">{currency(landValue)}</div>
                    </>
                  )}
                  {improvementValue > 0 && (
                    <>
                      <div className="kv-k">Improvements</div>
                      <div className="kv-v">{currency(improvementValue)}</div>
                    </>
                  )}
                  {totalAssessed > 0 && (
                    <>
                      <div className="kv-k">Total</div>
                      <div className="kv-v accent">{currency(totalAssessed)}</div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="res-side">
            <div className="side-panel-title">
              <span>Location</span>
              <span className="idx">MAP · 01</span>
            </div>
            <MapPlaceholder />

            <div className="side-panel-title">
              <span>Structure</span>
              <span className="idx">SEC · C</span>
            </div>
            <div className="parcel-summary">
              {data.yearBuilt && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Built</div>
                  <div className="parcel-stat-val">{data.yearBuilt}</div>
                  <div className="parcel-stat-sub">year</div>
                </div>
              )}
              {data.squareFootage && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Living</div>
                  <div className="parcel-stat-val">{Number(data.squareFootage).toLocaleString()}</div>
                  <div className="parcel-stat-sub">sq ft</div>
                </div>
              )}
              {data.lotSize && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Lot</div>
                  <div className="parcel-stat-val">{Number(data.lotSize).toLocaleString()}</div>
                  <div className="parcel-stat-sub">sq ft</div>
                </div>
              )}
              {data.bedrooms && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Bed</div>
                  <div className="parcel-stat-val">{data.bedrooms}</div>
                  <div className="parcel-stat-sub">rooms</div>
                </div>
              )}
              {data.bathrooms && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Bath</div>
                  <div className="parcel-stat-val">{data.bathrooms}</div>
                  <div className="parcel-stat-sub">count</div>
                </div>
              )}
              {data.stories && (
                <div className="parcel-stat">
                  <div className="parcel-stat-label">Stories</div>
                  <div className="parcel-stat-val">{data.stories}</div>
                  <div className="parcel-stat-sub">floors</div>
                </div>
              )}
            </div>

            <div className="actions">
              <button className="btn primary" onClick={onNewSearch}>New Search</button>
              {hasPrevious && (
                <button className="btn" onClick={onPreviousSearch}>Previous Search</button>
              )}
              <button className="btn" onClick={() => window.print()}>Print</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
