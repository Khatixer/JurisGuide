import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import SupabaseService from '../services/supabaseService';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session);
        setSession(session);
        
        if (session?.user) {
          console.log('User session found, loading profile...');
          await loadUserProfile(session.user);
        } else {
          console.log('No user session, clearing user state');
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser) => {
    try {
      // Try to get existing user profile
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        const newUser = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email,
          role: authUser.user_metadata?.role || 'client',
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.user_metadata?.full_name || authUser.email)}&background=6366f1&color=fff`
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          setUser({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email,
            role: 'client'
          });
        } else {
          setUser(createdUser);
        }
      } else if (existingUser) {
        setUser(existingUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback user object
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email,
        role: 'client'
      });
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      console.log('Attempting sign up with:', email, metadata);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/confirm`
        }
      });
      console.log('Sign up result:', { data, error });
      return { data, error };
    } catch (err) {
      console.error('Sign up error:', err);
      return { data: null, error: err };
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('Attempting sign in with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log('Sign in result:', { data, error });
      return { data, error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        // Clear localStorage for compatibility
        localStorage.removeItem('jurisguide_user');
        localStorage.removeItem('jurisguide_token');
      }
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  const isAuthenticated = !!session?.user;
  
  // Debug logging
  console.log('AuthContext state:', { 
    user: !!user, 
    session: !!session, 
    loading, 
    isAuthenticated 
  });

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};