import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import itTranslations from './locales/it.json';
import ptTranslations from './locales/pt.json';
import ruTranslations from './locales/ru.json';
import zhTranslations from './locales/zh.json';
import jaTranslations from './locales/ja.json';
import koTranslations from './locales/ko.json';
import arTranslations from './locales/ar.json';
import hiTranslations from './locales/hi.json';

// Translation resources
const resources = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
  de: { translation: deTranslations },
  it: { translation: itTranslations },
  pt: { translation: ptTranslations },
  ru: { translation: ruTranslations },
  zh: { translation: zhTranslations },
  ja: { translation: jaTranslations },
  ko: { translation: koTranslations },
  ar: { translation: arTranslations },
  hi: { translation: hiTranslations }
};

// Supported languages configuration
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
];

// RTL languages
export const rtlLanguages = ['ar'];

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'jurisguide_language'
    },

    interpolation: {
      escapeValue: false // React already does escaping
    },

    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],

    // React specific options
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span']
    }
  });

// Function to change language and update user preferences
export const changeLanguage = async (languageCode) => {
  try {
    await i18n.changeLanguage(languageCode);
    
    // Update document direction for RTL languages
    document.dir = rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
    
    // Store in localStorage
    localStorage.setItem('jurisguide_language', languageCode);
    
    // Update user preferences on server if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Import dynamically to avoid circular dependency
      const { syncLanguagePreference } = await import('../utils/languageSync');
      await syncLanguagePreference(languageCode);
    }
    
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
};

// Function to get current language
export const getCurrentLanguage = () => i18n.language;

// Function to get language display name
export const getLanguageDisplayName = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.nativeName : code;
};

// Function to check if language is RTL
export const isRTL = (languageCode = getCurrentLanguage()) => {
  return rtlLanguages.includes(languageCode);
};

export default i18n;