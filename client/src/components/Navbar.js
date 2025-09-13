import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="text-xl font-bold hover:text-blue-200">
              JurisGuide
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                {t('navigation.dashboard')}
              </Link>
              
              <Link
                to="/legal-guidance"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/legal-guidance') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                {t('navigation.legal_guidance')}
              </Link>
              
              <Link
                to="/find-lawyer"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/find-lawyer') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                {t('navigation.find_lawyer')}
              </Link>
              
              <Link
                to="/mediation"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/mediation') 
                    ? 'bg-blue-700 text-white' 
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                {t('navigation.mediation')}
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {t('common.welcome')}, {user?.name} ({user?.role})
            </span>
            <button
              onClick={logout}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t('navigation.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;