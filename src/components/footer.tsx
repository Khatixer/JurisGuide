import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0A2540] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">JurisGuide</h3>
            <p className="text-gray-300 mb-3 sm:mb-4 max-w-md text-sm sm:text-base">
              Your AI Guide to Legal Clarity. Get instant legal insights and resolve disputes through intelligent mediation.
            </p>
            <div className="text-gray-400 text-xs sm:text-sm">
              Trusted by legal professionals worldwide
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link 
                  href="/how-it-works" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link 
                  href="/features" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  href="/pricing" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link 
                  href="/contact" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="hover:text-[#00C48C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 focus:ring-offset-[#0A2540] rounded-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
          <p className="text-xs sm:text-sm">&copy; 2024 JurisGuide. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}