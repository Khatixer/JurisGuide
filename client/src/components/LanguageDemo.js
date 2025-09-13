import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

const LanguageDemo = () => {
  const { t, translateLegalCategory, translateCulturalBackground, formatDate, formatCurrency } = useTranslation();
  const { currentLanguage, isRightToLeft } = useLanguage();

  const sampleData = {
    legalCategories: ['contract_dispute', 'employment_law', 'family_law'],
    culturalBackgrounds: ['western', 'eastern', 'latin'],
    date: new Date(),
    amount: 1500.50
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${isRightToLeft ? 'rtl' : 'ltr'}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('navigation.dashboard')} - {t('language_selector.current_language')}: {currentLanguage.toUpperCase()}
        </h1>

        {/* Language Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('language_selector.select_language')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Dropdown Selector</h3>
              <LanguageSelector variant="dropdown" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Inline Selector</h3>
              <LanguageSelector variant="inline" showLabel={false} />
            </div>
          </div>
        </div>

        {/* Common Translations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('common.common', { defaultValue: 'Common Translations' })}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['loading', 'error', 'success', 'cancel', 'save', 'submit', 'search', 'filter'].map(key => (
              <div key={key} className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">{key}</div>
                <div className="font-medium">{t(`common.${key}`)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Translations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('navigation.navigation', { defaultValue: 'Navigation' })}
          </h2>
          <div className="flex flex-wrap gap-2">
            {['home', 'dashboard', 'profile', 'settings', 'legal_guidance', 'find_lawyer', 'mediation'].map(key => (
              <span key={key} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {t(`navigation.${key}`)}
              </span>
            ))}
          </div>
        </div>

        {/* Legal Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('legal_categories.legal_categories', { defaultValue: 'Legal Categories' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sampleData.legalCategories.map(category => (
              <div key={category} className="bg-green-50 p-3 rounded border border-green-200">
                <div className="text-sm text-green-600">{category}</div>
                <div className="font-medium text-green-800">{translateLegalCategory(category)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cultural Backgrounds */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('cultural_backgrounds.cultural_backgrounds', { defaultValue: 'Cultural Backgrounds' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sampleData.culturalBackgrounds.map(background => (
              <div key={background} className="bg-purple-50 p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600">{background}</div>
                <div className="font-medium text-purple-800">{translateCulturalBackground(background)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Formatting Examples */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Localized Formatting
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">Date Formatting</h3>
              <div className="text-yellow-700">
                {formatDate(sampleData.date)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <h3 className="font-medium text-orange-800 mb-2">Currency Formatting</h3>
              <div className="text-orange-700">
                {formatCurrency(sampleData.amount)}
              </div>
            </div>
          </div>
        </div>

        {/* RTL Indicator */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Text Direction
          </h2>
          <div className={`p-4 rounded border-2 ${isRightToLeft ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
            <div className={`font-medium ${isRightToLeft ? 'text-red-800' : 'text-blue-800'}`}>
              Current Direction: {isRightToLeft ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
            </div>
            <div className={`text-sm mt-2 ${isRightToLeft ? 'text-red-600' : 'text-blue-600'}`}>
              This text should flow in the {isRightToLeft ? 'right-to-left' : 'left-to-right'} direction.
            </div>
          </div>
        </div>

        {/* Auth Form Example */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('auth.login_title')}
          </h2>
          <div className="max-w-md bg-gray-50 p-6 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('auth.email')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('auth.password')}
                />
              </div>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                {t('auth.sign_in')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageDemo;