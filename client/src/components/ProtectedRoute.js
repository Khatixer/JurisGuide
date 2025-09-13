import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, session, user } = useAuth();
  const [timeoutReached, setTimeoutReached] = React.useState(false);

  // Set timeout for authentication check
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, []);

  console.log('ProtectedRoute check:', { 
    isAuthenticated, 
    loading, 
    hasSession: !!session,
    hasUser: !!user,
    timeoutReached
  });

  // If we have a session and user, allow access immediately
  if (session?.user && user) {
    console.log('ProtectedRoute: Session and user found, allowing access');
    return children;
  }

  // If authenticated, allow access
  if (isAuthenticated && user) {
    console.log('ProtectedRoute: Authenticated with user, allowing access');
    return children;
  }

  // Show loading while checking authentication (but not forever)
  if (loading && !timeoutReached) {
    console.log('ProtectedRoute: Loading authentication...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
          <p className="text-sm text-gray-400 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // If not authenticated after timeout or loading is complete, redirect to login
  console.log('ProtectedRoute: Not authenticated, redirecting to login');
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;