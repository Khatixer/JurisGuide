import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getCurrentLanguage, 
  changeLanguage, 
  isRTL, 
  supportedLanguages 
} from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [isRightToLeft, setIsRightToLeft] = useState(isRTL());
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Update state when language changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
      setIsRightToLeft(isRTL(lng));
      
      // Update document direction
      document.dir = isRTL(lng) ? 'rtl' : 'ltr';
      
      // Update document language attribute
      document.documentElement.lang = lng;
    };

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    // Set initial state
    handleLanguageChange(i18n.language);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const handleChangeLanguage = async (languageCode) => {
    if (languageCode === currentLanguage) {
      return true;
    }

    setIsChangingLanguage(true);
    try {
      const success = await changeLanguage(languageCode);
      if (success) {
        // Language state will be updated by the event listener
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const getLanguageInfo = (code = currentLanguage) => {
    return supportedLanguages.find(lang => lang.code === code) || supportedLanguages[0];
  };

  const value = {
    currentLanguage,
    isRightToLeft,
    isChangingLanguage,
    supportedLanguages,
    changeLanguage: handleChangeLanguage,
    getLanguageInfo,
    isRTL: (code) => isRTL(code)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;