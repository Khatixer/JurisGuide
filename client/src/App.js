import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import JurisGuideHome from './components/JurisGuideHome';
import SimpleAuth from './components/SimpleAuth';
import EmailConfirmation from './components/EmailConfirmation';
import JurisGuideDashboard from './components/JurisGuideDashboard';
import SimpleLegalGuidance from './components/SimpleLegalGuidance';
import SimpleLawyerMatching from './components/SimpleLawyerMatching';
import SimpleMediation from './components/SimpleMediation';
import LanguageDemo from './components/LanguageDemo';
import './i18n'; // Initialize i18n

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<JurisGuideHome />} />
              <Route path="/login" element={<SimpleAuth isLogin={true} />} />
              <Route path="/register" element={<SimpleAuth isLogin={false} />} />
              <Route path="/confirm" element={<EmailConfirmation />} />
              <Route path="/language-demo" element={<LanguageDemo />} />
              
              {/* Temporary unprotected dashboard for testing */}
              <Route path="/dashboard-direct" element={<JurisGuideDashboard />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<JurisGuideDashboard />} />
              <Route path="/legal-guidance" element={
                <ProtectedRoute>
                  <SimpleLegalGuidance />
                </ProtectedRoute>
              } />
              <Route path="/find-lawyer" element={
                <ProtectedRoute>
                  <SimpleLawyerMatching />
                </ProtectedRoute>
              } />
              <Route path="/mediation" element={
                <ProtectedRoute>
                  <SimpleMediation />
                </ProtectedRoute>
              } />
              
              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;