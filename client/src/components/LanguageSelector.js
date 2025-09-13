import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  supportedLanguages, 
  changeLanguage, 
  getCurrentLanguage, 
  getLanguageDisplayName 
} from '../i18n';

const LanguageSelector = ({ className = '', showLabel = true, variant = 'dropdown' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const currentLanguage = getCurrentLanguage();

  const handleLanguageChange = async (languageCode) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      const success = await changeLanguage(languageCode);
      if (success) {
        // Show success message briefly
        setTimeout(() => {
          setIsChanging(false);
        }, 500);
      } else {
        setIsChanging(false);
        // Could show error message here
      }
    } catch (error) {
      console.error('Error changing language:', error);
      setIsChanging(false);
    }
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('language_selector.select_language')}:
          </span>
        )}
        {supportedLanguages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            disabled={isChanging}
            className={`
              px-3 py-1 text-sm rounded-md transition-colors duration-200
              ${currentLanguage === language.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {language.nativeName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('language_selector.select_language')}
        </label>
      )}
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging}
          className={`
            w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
            rounded-md px-4 py-2 text-left shadow-sm focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200
            ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {getLanguageDisplayName(currentLanguage)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                ({currentLanguage})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {isChanging && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              )}
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'transform rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={isChanging}
                  className={`
                    w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 
                    transition-colors duration-150 focus:outline-none focus:bg-gray-100 
                    dark:focus:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                    ${currentLanguage === language.code 
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{language.nativeName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {language.name}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
                      {language.code}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;