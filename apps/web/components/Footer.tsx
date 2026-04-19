import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="foot-inner">
        <div>
          <div className="foot-brand">PropLookup<span style={{ color: 'var(--red)' }}>.</span></div>
          <div className="foot-desc">
            An independent public-records property search tool. Not affiliated with any government agency. Data sourced from public records.
          </div>
        </div>
        <div className="foot-col">
          <h4>Product</h4>
          <ul>
            <li><Link href="/">Search</Link></li>
            <li><Link href="#">API Access</Link></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Data</h4>
          <ul>
            <li><Link href="#">Sources</Link></li>
            <li><Link href="#">Coverage</Link></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>About</h4>
          <ul>
            <li><Link href="#">Privacy</Link></li>
            <li><Link href="#">Terms</Link></li>
            <li><Link href="#">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <div>&copy; 2025 PropLookup. All rights reserved. Not affiliated with any government agency.</div>
        <div className="mono">Independent property data</div>
      </div>
    </footer>
  );
}
