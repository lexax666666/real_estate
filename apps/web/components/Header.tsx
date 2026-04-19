'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <>
      {/* Disclaimer bar */}
      <div className="bg-teal-50 border-b border-teal-200 px-4 py-1.5">
        <div className="container mx-auto text-xs text-teal-700">
          This is an independent property search tool. Not affiliated with any government agency.
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="container mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8">
              <path d="M16 4L3 14h4v12h7v-8h4v8h7V14h4L16 4z" fill="#0d9488"/>
              <circle cx="22" cy="20" r="5" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
              <line x1="25.5" y1="23.5" x2="30" y2="28" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-bold text-teal-700">PropertyScope</span>
          </Link>
        </div>
      </div>

      {/* Hero section */}
      <div className="relative h-48 bg-gradient-to-r from-teal-700 to-teal-900 overflow-hidden">
        <div className="relative container mx-auto h-full flex items-center px-4">
          <div className="text-white">
            <h1 className="text-3xl font-bold">Property Data Search</h1>
            <p className="text-teal-100 mt-2">Search property records including ownership, valuations, and sale history</p>
          </div>
        </div>
      </div>
    </>
  );
}
