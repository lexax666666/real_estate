import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">Top Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://mva.maryland.gov/vehicles" target="_blank" rel="noopener noreferrer" className="hover:underline">Vehicle Services</Link></li>
              <li><Link href="https://dhs.maryland.gov/supplemental-nutrition-assistance-program/" target="_blank" rel="noopener noreferrer" className="hover:underline">Food Assistance/SNAP</Link></li>
              <li><Link href="https://www.labor.maryland.gov/employment/unemployment.shtml" target="_blank" rel="noopener noreferrer" className="hover:underline">Unemployment Services</Link></li>
              <li><Link href="https://www.marylandtaxes.gov/individual/index.php" target="_blank" rel="noopener noreferrer" className="hover:underline">Taxes</Link></li>
              <li><Link href="https://elections.maryland.gov/voter_registration/index.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Register to Vote</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Government</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://governor.maryland.gov/" target="_blank" rel="noopener noreferrer" className="hover:underline">Governor Wes Moore</Link></li>
              <li><Link href="https://governor.maryland.gov/leadership/cabinet/" target="_blank" rel="noopener noreferrer" className="hover:underline">Maryland Cabinet</Link></li>
              <li><Link href="http://www.maryland.gov/pages/agency_directory.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">All State Agencies</Link></li>
              <li><Link href="https://www.maryland.gov/pages/jobs.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">Maryland State Jobs</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://www.maryland.gov/pages/residents.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">Resident Resources</Link></li>
              <li><Link href="https://www.visitmaryland.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">Visit Maryland</Link></li>
              <li><Link href="https://www.maryland.gov/pages/online_services.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">More Online Services</Link></li>
              <li><Link href="https://dat.maryland.gov/pages/contact_us.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://www.facebook.com/pages/Maryland-State-Department-of-Assessments-and-Taxation/218721461546884" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</Link></li>
              <li><Link href="https://x.com/MarylandDAT" target="_blank" rel="noopener noreferrer" className="hover:underline">Twitter (X)</Link></li>
              <li><Link href="https://www.linkedin.com/company/mdsdat/" target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</Link></li>
              <li><Link href="https://www.ola.state.md.us/fraud/ola-fraud-hotline/" target="_blank" rel="noopener noreferrer" className="hover:underline">Report Fraud</Link></li>
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