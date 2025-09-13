import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseService from '../services/supabaseService';

const SimpleMediation = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [mediationCases, setMediationCases] = useState([]);
  const [newCaseForm, setNewCaseForm] = useState({
    title: '',
    description: '',
    parties: '',
    category: 'contract',
    urgency: 'medium'
  });

  const loadMediationCases = async () => {
    try {
      const { data, error } = await SupabaseService.getMediationCases();
      if (error) {
        console.error('Failed to load mediation cases:', error);
        return;
      }
      setMediationCases(data || []);
    } catch (error) {
      console.error('Failed to load mediation cases:', error);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await SupabaseService.createMediationCase({
        title: newCaseForm.title,
        description: newCaseForm.description,
        parties: newCaseForm.parties.split(',').map(p => p.trim()),
        category: newCaseForm.category,
        urgency: newCaseForm.urgency,
        status: 'pending',
        progress: 0,
        next_session: 'AI analysis in progress'
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.length > 0) {
        setMediationCases([data[0], ...mediationCases]);
        setNewCaseForm({
          title: '',
          description: '',
          parties: '',
          category: 'contract',
          urgency: 'medium'
        });
        setCurrentView('dashboard');
        alert('Mediation case created successfully! AI analysis will begin shortly.');
      }
    } catch (error) {
      console.error('Error creating mediation case:', error);
      alert('Failed to create mediation case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartMediation = (caseId) => {
    alert(`Starting AI-powered mediation session for case ${caseId}.\n\nThe AI mediator will:\n• Analyze the dispute\n• Facilitate communication\n• Suggest fair resolutions\n• Document agreements`);
  };

  React.useEffect(() => {
    loadMediationCases();
  }, []);

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
              <h1 className="text-2xl font-bold text-gray-900">AI Mediation</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'dashboard' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                My Cases ({mediationCases.length})
              </button>
              <button
                onClick={() => setCurrentView('create')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'create' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                + New Case
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-indigo-600 mb-1">
                  {mediationCases.length}
                </div>
                <div className="text-sm text-gray-600">Total Cases</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {mediationCases.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Cases</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {mediationCases.filter(c => c.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Cases</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {mediationCases.filter(c => c.status === 'resolved').length}
                </div>
                <div className="text-sm text-gray-600">Resolved Cases</div>
              </div>
            </div>

            {/* Cases List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  🤝 Your Mediation Cases
                </h2>
              </div>
              
              {mediationCases.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 text-4xl mb-4">⚖️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No mediation cases yet</h3>
                  <p className="text-gray-600 mb-4">Create your first mediation case to get started</p>
                  <button
                    onClick={() => setCurrentView('create')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Create New Case
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {mediationCases.map((mediationCase) => (
                    <div key={mediationCase.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {mediationCase.title}
                          </h3>
                          <p className="text-gray-600 mb-2">{mediationCase.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>👥 {mediationCase.parties.join(' vs ')}</span>
                            <span>📅 Created {mediationCase.createdAt}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(mediationCase.status)}`}>
                          {mediationCase.status.charAt(0).toUpperCase() + mediationCase.status.slice(1)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{mediationCase.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full" 
                            style={{ width: `${mediationCase.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          📅 Next: {mediationCase.nextSession}
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleStartMediation(mediationCase.id)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                          >
                            🤖 Start AI Mediation
                          </button>
                          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                            📄 View Details
                          </button>
                          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                            💬 Messages
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create New Case */}
        {currentView === 'create' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              🆕 Create New Mediation Case
            </h2>
            
            <form onSubmit={handleCreateCase} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Title *
                </label>
                <input
                  type="text"
                  value={newCaseForm.title}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief description of the dispute"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  value={newCaseForm.description}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Provide detailed information about the dispute, including background, key issues, and desired outcomes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parties Involved *
                </label>
                <input
                  type="text"
                  value={newCaseForm.parties}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, parties: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter party names separated by commas (e.g., John Smith, ABC Company)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple parties with commas
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispute Category
                  </label>
                  <select
                    value={newCaseForm.category}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="contract">Contract Dispute</option>
                    <option value="employment">Employment Issue</option>
                    <option value="business">Business Partnership</option>
                    <option value="property">Property Dispute</option>
                    <option value="family">Family Matter</option>
                    <option value="consumer">Consumer Complaint</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Level
                  </label>
                  <select
                    value={newCaseForm.urgency}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low - No immediate deadline</option>
                    <option value="medium">Medium - Resolve within weeks</option>
                    <option value="high">High - Urgent resolution needed</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">🤖 AI Mediation Process</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI will analyze the dispute and identify key issues</li>
                  <li>• Facilitate structured communication between parties</li>
                  <li>• Suggest fair and balanced resolution options</li>
                  <li>• Document agreements and next steps</li>
                  <li>• Provide cultural sensitivity and bias-free mediation</li>
                </ul>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Case...
                    </div>
                  ) : (
                    '🚀 Create Mediation Case'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleMediation;