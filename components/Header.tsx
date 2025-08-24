'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [showNotification, setShowNotification] = useState(true);

  return (
    <>
      {/* Blue notification bar */}
      {showNotification && (
        <div className="bg-blue-600 text-white p-4 text-sm">
        <div className="container mx-auto flex items-center gap-3">
          <div className="bg-white text-blue-600 p-2 rounded-full flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">SDAT's Tax Credit Public Service Counter has moved!</p>
            <p>In person services have moved from 301 W. Preston St. to SDAT's new location at 123 Market Place, Baltimore, MD 21202</p>
            <p>Why wait? File online: <a href="#" className="underline">taxcredits.sdat.maryland.gov</a></p>
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            className="ml-auto hover:opacity-80"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* State bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">An official website of the State of Maryland.</span>
            <button className="text-blue-600 hover:underline flex items-center gap-1">
              Here's how you know
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-gray-600 hover:text-gray-800">Maryland State Jobs</Link>
            <Link href="#" className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              Translate
            </Link>
          </div>
        </div>
      </div>

      {/* Main header with logo and search */}
      <div className="bg-white border-b border-gray-300 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://egov.maryland.gov/doit/ewf/widgets/header/v2/img/mdgov-logo-2018-black.png" 
              alt="Maryland.gov" 
              className="h-10"
            />
          </div>
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="Enter search term"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Hero section with background image */}
      <div 
        className="relative h-64 overflow-hidden"
        style={{ 
          backgroundImage: 'url(https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/masthead-bg-fluid-1920x250.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container mx-auto h-full flex items-center px-4">
          <div className="flex items-center gap-4">
            <div className="rounded shadow-lg">
              <img 
                src="https://sdat.dat.maryland.gov/RealProperty/egov/dist/img/logo.png" 
                alt="Maryland SDAT" 
                className="h-16"
              />
            </div>
            <div className="text-white">
              <h1 className="text-sm font-semibold uppercase tracking-wide">MARYLAND</h1>
              <h2 className="text-3xl font-bold">Department of Assessments and</h2>
              <h2 className="text-3xl font-bold">Taxation</h2>
            </div>
          </div>
          <div className="ml-auto flex gap-4">
            <a href="#" className="text-white hover:opacity-80">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="#" className="text-white hover:opacity-80">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="#" className="text-white hover:opacity-80">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}