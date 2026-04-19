import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <path d="M16 4L3 14h4v12h7v-8h4v8h7V14h4L16 4z" fill="#0d9488"/>
              <circle cx="22" cy="20" r="5" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
              <line x1="25.5" y1="23.5" x2="30" y2="28" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="font-semibold">PropertyScope</span>
          </div>

          <p className="text-gray-400 text-sm text-center max-w-md">
            PropertyScope is an independent property search tool. Not affiliated with any government agency. Data sourced from public records.
          </p>

          <div className="flex items-center gap-4 text-sm">
            <Link href="#" className="hover:underline text-gray-300">Privacy Policy</Link>
            <Link href="#" className="hover:underline text-gray-300">Terms of Use</Link>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 pt-4 text-center text-sm text-gray-400">
          &copy; 2025 PropertyScope. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
