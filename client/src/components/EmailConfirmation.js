import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [message, setMessage] = useState('Confirming your email...');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');

        console.log('Email confirmation params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Email confirmation error:', error);
            setMessage('❌ Email confirmation failed. Please try signing in again.');
            setIsProcessing(false);
            setTimeout(() => {
              navigate('/login');
            }, 3000);
            return;
          }

          if (data.user) {
            console.log('Email confirmed successfully:', data.user);
            setMessage('✅ Email confirmed successfully! Redirecting to dashboard...');
            setIsProcessing(false);
            // Force immediate redirect to dashboard
            setTimeout(() => {
              console.log('Email confirmation: Force redirecting to dashboard');
              window.location.replace('/dashboard');
            }, 1000);
            return;
          }
        }

        // If no tokens in URL, check if user is already authenticated
        if (!loading) {
          if (isAuthenticated) {
            setMessage('✅ Email confirmed successfully! Redirecting to dashboard...');
            setIsProcessing(false);
            setTimeout(() => {
              console.log('Email confirmation: Force redirecting to dashboard (authenticated)');
              window.location.replace('/dashboard');
            }, 1000);
          } else {
            setMessage('❌ Email confirmation failed or expired. Please try signing in again.');
            setIsProcessing(false);
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setMessage('❌ Email confirmation failed. Please try signing in again.');
        setIsProcessing(false);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleEmailConfirmation();
  }, [location.search, isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-indigo-600 mb-2">
            ⚖️ JurisGuide
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Email Confirmation
          </h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                <span className="text-gray-600">Processing...</span>
              </div>
            ) : (
              <div className={`p-4 rounded-lg ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-800' 
                  : message.includes('❌')
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;