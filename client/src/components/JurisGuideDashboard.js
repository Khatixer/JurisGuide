import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const JurisGuideDashboard = () => {
  const navigate = useNavigate();
  const { user: authUser, signOut, isAuthenticated, loading } = useAuth();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    console.log('Dashboard useEffect:', { authUser, isAuthenticated, loading });
    
    // Set a timeout to stop loading after 3 seconds regardless
    const loadingTimeout = setTimeout(() => {
      console.log('Dashboard: Loading timeout reached, checking localStorage');
      setDashboardLoading(false);
      
      // Force check localStorage if still loading
      const localUserData = localStorage.getItem('jurisguide_user');
      if (localUserData && !user) {
        console.log('Dashboard: Timeout - Using localStorage user data');
        const userData = JSON.parse(localUserData);
        setUser(userData);
        return;
      }
      
      // If no user data found, redirect to login
      if (!user) {
        console.log('Dashboard: Timeout - No user data found, redirecting to login');
        navigate('/login');
      }
    }, 3000);
    
    // Check Supabase auth first
    if (isAuthenticated && authUser) {
      console.log('Dashboard: Using Supabase auth user');
      const userData = {
        id: authUser.id,
        name: authUser.full_name || authUser.email,
        email: authUser.email,
        role: authUser.role || 'user',
        avatar: authUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.full_name || authUser.email)}&background=6366f1&color=fff`
      };
      
      console.log('Dashboard: Setting Supabase user data:', userData);
      setUser(userData);
      setDashboardLoading(false);
      clearTimeout(loadingTimeout);
      return;
    }
    
    // Check localStorage immediately if not loading
    if (!loading) {
      const localUserData = localStorage.getItem('jurisguide_user');
      if (localUserData) {
        console.log('Dashboard: Using localStorage user data');
        const userData = JSON.parse(localUserData);
        setUser(userData);
        setDashboardLoading(false);
        clearTimeout(loadingTimeout);
        return;
      }
      
      // No authentication found, redirect to login
      console.log('Dashboard: No authentication found, redirecting to login');
      navigate('/login');
      clearTimeout(loadingTimeout);
    }
    
    return () => clearTimeout(loadingTimeout);
  }, [authUser, isAuthenticated, loading, navigate, user]);

  const handleLogout = async () => {
    console.log('Dashboard: Logging out...');
    await signOut();
    navigate('/');
  };

  if ((loading || dashboardLoading) && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-xs text-gray-400 mt-2">
            Auth loading: {loading ? 'Yes' : 'No'} | Dashboard loading: {dashboardLoading ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  const getUserTypeColor = (role) => {
    switch (role) {
      case 'lawyer': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getUserTypeIcon = (role) => {
    switch (role) {
      case 'lawyer': return '👨‍💼';
      case 'admin': return '👑';
      default: return '👤';
    }
  };

  const getQuickActions = (role) => {
    switch (role) {
      case 'lawyer':
        return [
          { title: 'Legal Guidance', description: 'Get AI-powered legal advice', icon: '🤖', action: () => navigate('/legal-guidance') },
          { title: 'Find Lawyer', description: 'Match with qualified lawyers', icon: '🔍', action: () => navigate('/find-lawyer') },
          { title: 'Mediation', description: 'Resolve disputes through AI mediation', icon: '⚖️', action: () => navigate('/mediation') },
          { title: 'Coming Soon', description: 'More lawyer features coming soon', icon: '🚧', action: () => alert('Lawyer-specific features coming soon!') }
        ];
      case 'admin':
        return [
          { title: 'Legal Guidance', description: 'Get AI-powered legal advice', icon: '🤖', action: () => navigate('/legal-guidance') },
          { title: 'Find Lawyer', description: 'Match with qualified lawyers', icon: '🔍', action: () => navigate('/find-lawyer') },
          { title: 'Mediation', description: 'Resolve disputes through AI mediation', icon: '⚖️', action: () => navigate('/mediation') },
          { title: 'Coming Soon', description: 'Admin features coming soon', icon: '🚧', action: () => alert('Admin features coming soon!') }
        ];
      default:
        return [
          { title: 'Legal Guidance', description: 'Get AI-powered legal advice', icon: '🤖', action: () => navigate('/legal-guidance') },
          { title: 'Find Lawyer', description: 'Match with qualified lawyers', icon: '🔍', action: () => navigate('/find-lawyer') },
          { title: 'Mediation', description: 'Resolve disputes through AI mediation', icon: '⚖️', action: () => navigate('/mediation') },
          { title: 'Settings', description: 'Account settings and preferences', icon: '⚙️', action: () => alert('Settings page coming soon!') }
        ];
    }
  };

  const getStats = (role) => {
    switch (role) {
      case 'lawyer':
        return [
          { label: 'Active Cases', value: '12', change: '+2 this week' },
          { label: 'Total Earnings', value: '$4,250', change: '+$320 this month' },
          { label: 'Client Rating', value: '4.8/5', change: '95% satisfaction' },
          { label: 'Response Time', value: '2.3h', change: 'Avg response time' }
        ];
      case 'admin':
        return [
          { label: 'Total Users', value: '2,847', change: '+127 this month' },
          { label: 'Active Cases', value: '456', change: '+23 today' },
          { label: 'Revenue', value: '$28,450', change: '+12% this month' },
          { label: 'System Uptime', value: '99.9%', change: 'Last 30 days' }
        ];
      default:
        return [
          { label: 'Legal Queries', value: '8', change: '3 resolved this week' },
          { label: 'Lawyer Matches', value: '2', change: '1 consultation booked' },
          { label: 'Mediation Cases', value: '1', change: 'In progress' },
          { label: 'Satisfaction', value: '4.9/5', change: 'Your experience rating' }
        ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-indigo-600 mr-8">
                ⚖️ JurisGuide
              </div>
              <nav className="hidden md:flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getUserTypeColor(user.role)}`}>
                    {getUserTypeIcon(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.name}! {getUserTypeIcon(user.role)}
            </h1>
            <p className="text-indigo-100">
              {user.role === 'lawyer' && "Manage your cases and help clients with their legal needs."}
              {user.role === 'admin' && "Monitor platform performance and manage the JurisGuide ecosystem."}
              {user.role === 'user' && "Get AI-powered legal guidance and connect with qualified lawyers."}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {getStats(user.role).map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-gray-600 mb-1">{stat.label}</div>
                <div className="text-xs text-green-600">{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getQuickActions(user.role).map((action, index) => (
                <div
                  key={index}
                  onClick={action.action}
                  className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="text-3xl mb-3">{action.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {user.role === 'user' && (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">🤖</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">AI Legal Guidance Request</div>
                        <div className="text-xs text-gray-500">Asked about employment contract terms - 2 hours ago</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">👨‍💼</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Lawyer Match Found</div>
                        <div className="text-xs text-gray-500">Matched with Sarah Johnson for contract review - 1 day ago</div>
                      </div>
                    </div>
                  </>
                )}
                {user.role === 'lawyer' && (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📋</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">New Case Assignment</div>
                        <div className="text-xs text-gray-500">Contract review case from John Doe - 1 hour ago</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">💰</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Commission Earned</div>
                        <div className="text-xs text-gray-500">$150 commission from completed consultation - 3 hours ago</div>
                      </div>
                    </div>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm">⚠️</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">System Alert</div>
                        <div className="text-xs text-gray-500">High API usage detected - monitoring required - 30 min ago</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">👥</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">New User Registration</div>
                        <div className="text-xs text-gray-500">15 new users registered today - 2 hours ago</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JurisGuideDashboard;