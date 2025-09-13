import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SimpleAuth = ({ isLogin = true }) => {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'client'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('User is authenticated via useEffect, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setMessage('');

    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setMessage('❌ Request timed out. Please try again.');
    }, 10000); // 10 second timeout

    try {
      if (isLogin) {
        console.log('Login attempt with:', { email: formData.email });
        
        if (!formData.email || !formData.password) {
          setMessage('❌ Please enter both email and password');
          setLoading(false);
          return;
        }

        console.log('Starting authentication process...');
        
        // Test mode: Check if we should use test credentials
        const isTestMode = formData.email === 'test@test.com' && formData.password === 'test123';
        
        if (isTestMode) {
          console.log('Using test mode - bypassing Supabase');
          setMessage('✅ Test login successful! Redirecting to dashboard...');
          
          // Create a test user in localStorage for the dashboard
          const testUser = {
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@test.com',
            role: 'user',
            avatar: 'https://ui-avatars.com/api/?name=Test+User&background=6366f1&color=fff'
          };
          
          // Set localStorage for compatibility with dashboard
          localStorage.setItem('jurisguide_user', JSON.stringify(testUser));
          localStorage.setItem('jurisguide_token', 'test-token-123');
          
          // For test mode, try multiple redirect methods
          setTimeout(() => {
            console.log('Test mode: Method 1 - React Router navigate');
            navigate('/dashboard', { replace: true });
          }, 500);
          
          setTimeout(() => {
            console.log('Test mode: Method 2 - window.location.replace');
            window.location.replace('/dashboard');
          }, 1500);
          
          setTimeout(() => {
            console.log('Test mode: Method 3 - window.location.href');
            window.location.href = '/dashboard';
          }, 2500);
          
          return;
        }
        
        // Use the signIn function from AuthContext
        const result = await signIn(formData.email, formData.password);
        console.log('SignIn result:', result);
        
        if (result.error) {
          console.error('Login error:', result.error);
          setMessage(`❌ Login failed: ${result.error.message}`);
          return;
        }
        
        if (result.data?.user) {
          console.log('Login successful:', result.data.user);
          setMessage('✅ Login successful! Redirecting to dashboard...');
          
          // Single redirect method - use navigate with replace
          setTimeout(() => {
            console.log('Redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          console.log('No user data returned from signIn');
          setMessage('❌ Login failed: No user data received');
        }
      } else {
        // Handle registration
        const { data, error } = await signUp(formData.email, formData.password, {
          full_name: formData.name,
          role: formData.userType
        });
        
        if (error) {
          setMessage(`❌ Registration failed: ${error.message}`);
          setLoading(false);
          return;
        }
        
        if (data.user) {
          if (data.session) {
            // User is automatically signed in (email confirmation disabled or auto-confirmed)
            setMessage('✅ Account created successfully! Redirecting to dashboard...');
            // Force immediate redirect to dashboard
            setLoading(false);
            setTimeout(() => {
              console.log('Registration: Force redirecting to dashboard...');
              window.location.replace('/dashboard');
            }, 1000);
          } else {
            // Email confirmation required
            setMessage('✅ Account created successfully! Please check your email for a confirmation link. Once confirmed, you can sign in and access your dashboard.');
            // Clear form and switch to login mode after showing message
            setLoading(false);
            setTimeout(() => {
              setFormData({
                email: '',
                password: '',
                name: '',
                userType: 'client'
              });
              setMessage('');
              navigate('/login');
            }, 5000);
          }
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage(`❌ ${isLogin ? 'Login' : 'Registration'} failed. Please try again.`);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl font-bold text-indigo-600 mb-2">
            ⚖️ JurisGuide
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Test Mode Info */}
        {isLogin && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
            <p className="text-blue-800 font-medium">🧪 Test Mode Available</p>
            <p className="text-blue-600 mt-1">
              Use <code className="bg-blue-100 px-1 rounded">test@test.com</code> / <code className="bg-blue-100 px-1 rounded">test123</code> to test the redirect functionality
            </p>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}





        {/* Regular Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={!isLogin}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <select
                  id="userType"
                  name="userType"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                >
                  <option value="client">Client (Seeking Legal Help)</option>
                  <option value="mediator">Mediator (Providing Mediation Services)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-indigo-600 hover:text-indigo-500 block"
            >
              ← Back to Home
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Direct navigation test...');
                navigate('/dashboard', { replace: true });
              }}
              className="text-sm text-green-600 hover:text-green-500 block"
            >
              🚀 Test Direct Navigation to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Direct window.location test...');
                window.location.href = '/dashboard';
              }}
              className="text-sm text-purple-600 hover:text-purple-500 block"
            >
              🔗 Test Window Location to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Setting test user and navigating...');
                const testUser = {
                  id: 'test-user-123',
                  name: 'Test User',
                  email: 'test@test.com',
                  role: 'user',
                  avatar: 'https://ui-avatars.com/api/?name=Test+User&background=6366f1&color=fff'
                };
                localStorage.setItem('jurisguide_user', JSON.stringify(testUser));
                localStorage.setItem('jurisguide_token', 'test-token-123');
                navigate('/dashboard', { replace: true });
              }}
              className="text-sm text-orange-600 hover:text-orange-500 block"
            >
              🧪 Set Test User & Navigate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleAuth;