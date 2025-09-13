import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

// Enhanced translation hook with additional utilities
export const useTranslation = (namespace = 'translation') => {
  const { t, i18n, ready } = useI18nTranslation(namespace);
  const { currentLanguage, isRightToLeft } = useLanguage();

  // Enhanced translation function with fallback
  const translate = (key, options = {}) => {
    try {
      const translation = t(key, options);
      
      // If translation is the same as the key, it might be missing
      if (translation === key && process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation for key: ${key} in language: ${currentLanguage}`);
      }
      
      return translation;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key; // Return the key as fallback
    }
  };

  // Translate with pluralization
  const translatePlural = (key, count, options = {}) => {
    return translate(key, { count, ...options });
  };

  // Translate with interpolation
  const translateWithValues = (key, values = {}, options = {}) => {
    return translate(key, { ...values, ...options });
  };

  // Get translation for legal categories
  const translateLegalCategory = (category) => {
    return translate(`legal_categories.${category}`, { defaultValue: category });
  };

  // Get translation for cultural backgrounds
  const translateCulturalBackground = (background) => {
    return translate(`cultural_backgrounds.${background}`, { defaultValue: background });
  };

  // Get translation for urgency levels
  const translateUrgency = (urgency) => {
    return translate(`legal_guidance.urgency_${urgency}`, { defaultValue: urgency });
  };

  // Get translation for error messages
  const translateError = (errorCode, defaultMessage = 'An error occurred') => {
    return translate(`errors.${errorCode}`, { defaultValue: defaultMessage });
  };

  // Format date according to current locale
  const formatDate = (date, options = {}) => {
    try {
      return new Intl.DateTimeFormat(currentLanguage, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
      }).format(new Date(date));
    } catch (error) {
      console.error('Date formatting error:', error);
      return date.toString();
    }
  };

  // Format currency according to current locale
  const formatCurrency = (amount, currency = 'USD', options = {}) => {
    try {
      return new Intl.NumberFormat(currentLanguage, {
        style: 'currency',
        currency,
        ...options
      }).format(amount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currency} ${amount}`;
    }
  };

  // Format number according to current locale
  const formatNumber = (number, options = {}) => {
    try {
      return new Intl.NumberFormat(currentLanguage, options).format(number);
    } catch (error) {
      console.error('Number formatting error:', error);
      return number.toString();
    }
  };

  return {
    // Original i18next functions
    t: translate,
    i18n,
    ready,
    
    // Enhanced functions
    translate,
    translatePlural,
    translateWithValues,
    translateLegalCategory,
    translateCulturalBackground,
    translateUrgency,
    translateError,
    
    // Formatting functions
    formatDate,
    formatCurrency,
    formatNumber,
    
    // Language info
    currentLanguage,
    isRightToLeft,
    
    // Utility functions
    isTranslationReady: ready,
    changeLanguage: i18n.changeLanguage
  };
};

export default useTranslation;