import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseService from '../services/supabaseService';

const SimpleLegalGuidance = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('form');
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    category: 'contract',
    jurisdiction: 'US',
    urgency: 'medium',
    culturalBackground: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Submit the legal query to Supabase
      const { data: queryData, error: queryError } = await SupabaseService.createLegalQuery({
        title: formData.description.substring(0, 100),
        description: formData.description,
        category: formData.category,
        jurisdiction: [formData.jurisdiction],
        urgency: formData.urgency,
        cultural_background: formData.culturalBackground,
        language: 'en'
      });

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Generate mock AI guidance (in production, integrate with OpenAI)
      const mockGuidance = generateMockGuidance(queryData[0], formData);
      
      // Save guidance to Supabase
      const { error: guidanceError } = await SupabaseService.createLegalGuidance({
        query_id: queryData[0].id,
        guidance_steps: mockGuidance.guidanceSteps,
        applicable_laws: mockGuidance.applicableLaws,
        cultural_considerations: mockGuidance.culturalConsiderations,
        next_actions: mockGuidance.nextActions,
        confidence: mockGuidance.confidence,
        complexity: mockGuidance.complexity,
        estimated_resolution_time: mockGuidance.estimatedResolutionTime
      });

      if (guidanceError) {
        console.warn('Failed to save guidance:', guidanceError);
      }

      setGuidance(mockGuidance);
      setCurrentView('guidance');
      loadHistory();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await SupabaseService.getLegalQueries();
      if (error) {
        console.error('Failed to load history:', error);
        return;
      }
      setQueryHistory(data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const generateMockGuidance = (query, formData) => {
    return {
      queryId: query.id,
      guidanceSteps: [
        {
          title: 'Understanding Your Legal Issue',
          description: `Based on your ${formData.category || 'legal'} question, here's what you need to know:`,
          content: `Your query about "${formData.description?.substring(0, 100) || 'legal matter'}" falls under ${formData.category || 'general'} law. This is a common legal issue that can be addressed through proper legal channels.`,
          actionItems: [
            'Review the relevant laws and regulations',
            'Gather all necessary documentation',
            'Consider consulting with a qualified attorney'
          ]
        },
        {
          title: 'Legal Framework & Jurisdiction',
          description: `Applicable laws in ${formData.jurisdiction || 'your jurisdiction'}:`,
          content: `The legal framework governing your situation includes both federal and state/local laws. In ${formData.jurisdiction || 'your jurisdiction'}, specific regulations may apply to your case.`,
          actionItems: [
            'Research local statutes and regulations',
            'Check for recent legal updates',
            'Understand your rights and obligations'
          ]
        },
        {
          title: 'Recommended Next Steps',
          description: 'Here are the immediate actions you should consider:',
          content: 'Based on the urgency level and complexity of your case, we recommend taking systematic steps to address your legal concerns.',
          actionItems: [
            'Document all relevant facts and evidence',
            'Consult with a specialized attorney',
            'Consider alternative dispute resolution if applicable',
            'Set realistic timelines for resolution'
          ]
        }
      ],
      applicableLaws: [
        {
          title: `${formData.category || 'General'} Law Basics`,
          description: 'Fundamental legal principles that apply to your situation',
          jurisdiction: formData.jurisdiction || 'General'
        }
      ],
      culturalConsiderations: {
        communicationStyle: 'Direct and professional',
        culturalFactors: ['Legal system familiarity', 'Language considerations', 'Cultural norms'],
        recommendations: 'Seek legal counsel familiar with your cultural background'
      },
      nextActions: [
        {
          action: 'Consult Attorney',
          priority: 'High',
          timeframe: '1-2 weeks',
          description: 'Schedule consultation with qualified legal professional'
        },
        {
          action: 'Gather Documentation',
          priority: 'High',
          timeframe: '1 week',
          description: 'Collect all relevant documents and evidence'
        },
        {
          action: 'Research Options',
          priority: 'Medium',
          timeframe: '2-3 weeks',
          description: 'Explore all available legal remedies and alternatives'
        }
      ],
      confidence: 0.85,
      estimatedResolutionTime: '2-6 months',
      complexity: formData.urgency === 'high' ? 'High' : 'Medium'
    };
  };

  React.useEffect(() => {
    loadHistory();
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
              <h1 className="text-2xl font-bold text-gray-900">AI Legal Guidance</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('form')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'form' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                New Query
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`px-4 py-2 rounded-lg ${
                  currentView === 'history' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                History ({queryHistory.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Query Form */}
        {currentView === 'form' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              🤖 Describe Your Legal Question
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Question Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your legal issue in detail..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legal Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="contract">Contract Law</option>
                    <option value="employment">Employment Law</option>
                    <option value="family">Family Law</option>
                    <option value="criminal">Criminal Law</option>
                    <option value="property">Property Law</option>
                    <option value="business">Business Law</option>
                    <option value="immigration">Immigration Law</option>
                    <option value="personal_injury">Personal Injury</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdiction
                  </label>
                  <select
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low - General inquiry</option>
                    <option value="medium">Medium - Need guidance soon</option>
                    <option value="high">High - Urgent legal matter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cultural Background (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.culturalBackground}
                    onChange={(e) => setFormData({ ...formData, culturalBackground: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Hispanic, Asian, European..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating AI Guidance...
                  </div>
                ) : (
                  '🚀 Get AI Legal Guidance'
                )}
              </button>
            </form>
          </div>
        )}

        {/* AI Guidance Display */}
        {currentView === 'guidance' && guidance && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  🤖 AI Legal Guidance
                </h2>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Confidence: {Math.round(guidance.confidence * 100)}%
                  </span>
                  <span className="text-sm text-gray-600">
                    Complexity: {guidance.complexity}
                  </span>
                </div>
              </div>

              {guidance.guidanceSteps.map((step, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-gray-700 mb-3">{step.content}</p>
                  
                  {step.actionItems && step.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Action Items:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {step.actionItems.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              {guidance.nextActions && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    📋 Recommended Next Actions
                  </h3>
                  <div className="space-y-3">
                    {guidance.nextActions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          action.priority === 'High' ? 'bg-red-100 text-red-800' :
                          action.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {action.priority}
                        </span>
                        <div>
                          <div className="font-medium text-blue-900">{action.action}</div>
                          <div className="text-sm text-blue-700">{action.description}</div>
                          <div className="text-xs text-blue-600">Timeline: {action.timeframe}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Query History */}
        {currentView === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              📚 Query History
            </h2>
            {queryHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📝</div>
                <p className="text-gray-600">No queries yet. Submit your first legal question!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queryHistory.map((query, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 capitalize">
                        {query.category.replace('_', ' ')} Law
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(query.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">
                      {query.description.substring(0, 150)}...
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📍 {query.jurisdiction}</span>
                      <span>⚡ {query.urgency} priority</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        {query.status}
                      </span>
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

export default SimpleLegalGuidance;