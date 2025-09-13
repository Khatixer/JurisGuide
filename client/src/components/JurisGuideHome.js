import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSelector from './LanguageSelector';

const JurisGuideHome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: 'AI Legal Guidance',
      description: 'Get instant, jurisdiction-aware legal advice powered by advanced AI',
      icon: '⚖️',
      color: 'bg-blue-500'
    },
    {
      title: 'Smart Lawyer Matching',
      description: 'Find the perfect lawyer based on expertise, location, and budget',
      icon: '👨‍💼',
      color: 'bg-green-500'
    },
    {
      title: 'AI Mediation',
      description: 'Resolve disputes through AI-powered mediation services',
      icon: '🤝',
      color: 'bg-purple-500'
    },
    {
      title: 'Cultural Sensitivity',
      description: 'Legal guidance adapted to your cultural background and preferences',
      icon: '🌍',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-indigo-600">
                ⚖️ JurisGuide
              </div>
              <div className="ml-3 text-sm text-gray-600">
                AI-Powered Legal Platform
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <button
                onClick={() => navigate('/login')}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Legal Guidance Made
            <span className="text-indigo-600"> Intelligent</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get instant, culturally-sensitive legal advice, find the perfect lawyer, 
            and resolve disputes through AI-powered mediation - all in your language.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/legal-guidance')}
              className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Try AI Guidance
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Legal Solutions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for legal guidance and dispute resolution
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                  activeFeature === index
                    ? 'bg-indigo-50 border-2 border-indigo-200 transform scale-105'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`w-16 h-16 ${feature.color} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            See JurisGuide in Action
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Experience the power of AI-driven legal assistance
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div
              onClick={() => navigate('/legal-guidance')}
              className="bg-white p-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Legal Guidance
              </h3>
              <p className="text-gray-600 mb-4">
                Ask legal questions and get instant, jurisdiction-aware answers
              </p>
              <button className="text-indigo-600 font-semibold hover:text-indigo-800">
                Try Now →
              </button>
            </div>

            <div
              onClick={() => navigate('/find-lawyer')}
              className="bg-white p-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Find Lawyers
              </h3>
              <p className="text-gray-600 mb-4">
                Match with qualified lawyers based on your specific needs
              </p>
              <button className="text-indigo-600 font-semibold hover:text-indigo-800">
                Search Now →
              </button>
            </div>

            <div
              onClick={() => navigate('/mediation')}
              className="bg-white p-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Mediation
              </h3>
              <p className="text-gray-600 mb-4">
                Resolve disputes through intelligent mediation services
              </p>
              <button className="text-indigo-600 font-semibold hover:text-indigo-800">
                Start Mediation →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">50+</div>
              <div className="text-gray-600">Jurisdictions Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">25+</div>
              <div className="text-gray-600">Languages Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">10k+</div>
              <div className="text-gray-600">Legal Queries Resolved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">95%</div>
              <div className="text-gray-600">User Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who trust JurisGuide for their legal needs
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">⚖️ JurisGuide</div>
              <p className="text-gray-400">
                AI-powered legal platform for intelligent guidance and dispute resolution.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Legal Guidance</li>
                <li>Lawyer Matching</li>
                <li>AI Mediation</li>
                <li>Document Review</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Twitter</li>
                <li>LinkedIn</li>
                <li>Facebook</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 JurisGuide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JurisGuideHome;