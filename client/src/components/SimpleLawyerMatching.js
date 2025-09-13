import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseService from '../services/supabaseService';

const SimpleLawyerMatching = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('search');
  const [loading, setLoading] = useState(false);
  const [lawyers, setLawyers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    specialization: 'contract',
    location: '',
    maxBudget: '500',
    experience: 'any',
    language: 'english'
  });



  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (searchFilters.specialization !== 'any') filters.specialization = searchFilters.specialization;
      if (searchFilters.location) filters.location = searchFilters.location;
      if (searchFilters.maxBudget !== 'any') filters.maxBudget = searchFilters.maxBudget;
      if (searchFilters.language !== 'english') filters.language = searchFilters.language;
      
      const { data, error } = await SupabaseService.getLawyers(filters);
      
      if (error) {
        throw new Error(error.message);
      }
      
      setLawyers(data || []);
      setCurrentView('results');
    } catch (error) {
      console.error('Error searching lawyers:', error);
      alert('Failed to search lawyers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookConsultation = (lawyer) => {
    alert(`Consultation booking request sent to ${lawyer.name}!\n\nYou will receive a confirmation email shortly with available time slots.`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-indigo-600 hover:text-indigo-800 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Find Lawyers</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('search')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'search' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Search
              </button>
              <button
                onClick={() => setCurrentView('results')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'results' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Results ({lawyers.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Search Form */}
        {currentView === 'search' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              🔍 Find the Perfect Lawyer for Your Needs
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Specialization
                </label>
                <select
                  value={searchFilters.specialization}
                  onChange={(e) => setSearchFilters({ ...searchFilters, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="any">Any Specialization</option>
                  <option value="contract">Contract Law</option>
                  <option value="employment">Employment Law</option>
                  <option value="family">Family Law</option>
                  <option value="business">Business Law</option>
                  <option value="criminal">Criminal Law</option>
                  <option value="property">Property Law</option>
                  <option value="immigration">Immigration Law</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="City, State or ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Hourly Rate
                </label>
                <select
                  value={searchFilters.maxBudget}
                  onChange={(e) => setSearchFilters({ ...searchFilters, maxBudget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="any">Any Budget</option>
                  <option value="200">Under $200/hr</option>
                  <option value="300">Under $300/hr</option>
                  <option value="400">Under $400/hr</option>
                  <option value="500">Under $500/hr</option>
                  <option value="1000">Under $1000/hr</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={searchFilters.experience}
                  onChange={(e) => setSearchFilters({ ...searchFilters, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="any">Any Experience</option>
                  <option value="junior">1-3 years</option>
                  <option value="mid">4-8 years</option>
                  <option value="senior">9+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={searchFilters.language}
                  onChange={(e) => setSearchFilters({ ...searchFilters, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="mandarin">Mandarin</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Searching for Lawyers...
                </div>
              ) : (
                '🔍 Search Lawyers'
              )}
            </button>
          </div>
        )}

        {/* Search Results */}
        {currentView === 'results' && (
          <div>
            {lawyers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">👨‍💼</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lawyers found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
                <button
                  onClick={() => setCurrentView('search')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Modify Search
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Found {lawyers.length} lawyers matching your criteria
                  </h2>
                </div>

                {lawyers.map((lawyer) => (
                  <div key={lawyer.id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start space-x-4">
                      <img
                        src={lawyer.image}
                        alt={lawyer.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{lawyer.name}</h3>
                            <p className="text-indigo-600 font-medium">{lawyer.specialization}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">${lawyer.hourlyRate}/hr</div>
                            <div className="flex items-center">
                              <span className="text-yellow-400">★</span>
                              <span className="text-sm text-gray-600 ml-1">{lawyer.rating} rating</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-600">📍 {lawyer.location}</div>
                            <div className="text-sm text-gray-600">⏱️ {lawyer.experience} experience</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">🗣️ {lawyer.languages.join(', ')}</div>
                            <div className="text-sm text-green-600">📅 {lawyer.availability}</div>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-4">{lawyer.bio}</p>

                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleBookConsultation(lawyer)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                          >
                            📅 Book Consultation
                          </button>
                          <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 font-medium">
                            💬 Send Message
                          </button>
                          <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 font-medium">
                            👤 View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleLawyerMatching;