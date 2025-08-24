import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">Real Property</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Property Search</Link></li>
              <li><Link href="#" className="hover:underline">Tax Maps</Link></li>
              <li><Link href="#" className="hover:underline">Sales Data</Link></li>
              <li><Link href="#" className="hover:underline">Assessment Appeals</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Business Services</Link></li>
              <li><Link href="#" className="hover:underline">Tax Credits</Link></li>
              <li><Link href="#" className="hover:underline">Forms & Applications</Link></li>
              <li><Link href="#" className="hover:underline">Online Filing</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Reports & Statistics</Link></li>
              <li><Link href="#" className="hover:underline">Laws & Regulations</Link></li>
              <li><Link href="#" className="hover:underline">FAQs</Link></li>
              <li><Link href="#" className="hover:underline">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">News & Updates</Link></li>
              <li><Link href="#" className="hover:underline">Email Alerts</Link></li>
              <li><Link href="#" className="hover:underline">Social Media</Link></li>
              <li><Link href="#" className="hover:underline">Mobile Apps</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <Link href="#" className="hover:underline">Privacy Policy</Link>
              <Link href="#" className="hover:underline">Accessibility</Link>
              <Link href="#" className="hover:underline">Site Map</Link>
              <Link href="#" className="hover:underline">Terms of Use</Link>
            </div>
            <div className="text-gray-400">
              © 2024 Maryland Department of Assessments and Taxation
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}