'use client'

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-xl sm:text-2xl font-bold text-[#0A2540] focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              aria-label="JurisGuide Home"
            >
              JurisGuide
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-[#0A2540] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Home
              </Link>
              <Link 
                href="/how-it-works" 
                className="text-gray-700 hover:text-[#0A2540] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                How It Works
              </Link>
              <Link 
                href="/features" 
                className="text-gray-700 hover:text-[#0A2540] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Features
              </Link>
              <Link 
                href="/pricing" 
                className="text-gray-700 hover:text-[#0A2540] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Pricing
              </Link>
            </div>
          </div>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/login" 
              className="text-gray-700 hover:text-[#0A2540] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className="bg-[#0A2540] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0A2540]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-[#0A2540] p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2"
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
              <Link 
                href="/" 
                onClick={closeMenu}
                className="block text-gray-700 hover:text-[#0A2540] hover:bg-gray-50 px-3 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Home
              </Link>
              <Link 
                href="/how-it-works" 
                onClick={closeMenu}
                className="block text-gray-700 hover:text-[#0A2540] hover:bg-gray-50 px-3 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                How It Works
              </Link>
              <Link 
                href="/features" 
                onClick={closeMenu}
                className="block text-gray-700 hover:text-[#0A2540] hover:bg-gray-50 px-3 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Features
              </Link>
              <Link 
                href="/pricing" 
                onClick={closeMenu}
                className="block text-gray-700 hover:text-[#0A2540] hover:bg-gray-50 px-3 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
              >
                Pricing
              </Link>
              
              {/* Mobile Auth Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <Link 
                  href="/login" 
                  onClick={closeMenu}
                  className="block text-center text-gray-700 hover:text-[#0A2540] hover:bg-gray-50 px-3 py-3 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-md"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  onClick={closeMenu}
                  className="block text-center bg-[#0A2540] text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-[#0A2540]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 mx-3"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}