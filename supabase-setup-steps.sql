-- JurisGuide Platform Database Schema for Supabase
-- Run each section separately if you encounter errors

-- STEP 1: Create custom types
CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin');
CREATE TYPE query_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE case_status AS ENUM ('pending', 'active', 'resolved', 'cancelled');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');

-- STEP 2: Create users table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    phone TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create legal_queries table
CREATE TABLE public.legal_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    jurisdiction TEXT[] DEFAULT ARRAY['US'],
    urgency urgency_level DEFAULT 'medium',
    cultural_background TEXT,
    language TEXT DEFAULT 'en',
    status query_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create legal_guidance table
CREATE TABLE public.legal_guidance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_id UUID REFERENCES public.legal_queries(id) ON DELETE CASCADE,
    guidance_steps JSONB NOT NULL,
    applicable_laws JSONB,
    cultural_considerations JSONB,
    next_actions JSONB,
    confidence DECIMAL(3,2),
    complexity TEXT,
    estimated_resolution_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Create lawyers table
CREATE TABLE public.lawyers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    experience_years INTEGER,
    hourly_rate DECIMAL(10,2),
    location TEXT,
    languages TEXT[] DEFAULT ARRAY['English'],
    bio TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    availability TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 6: Create mediation_cases table
CREATE TABLE public.mediation_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    parties TEXT[] NOT NULL,
    category TEXT NOT NULL,
    urgency urgency_level DEFAULT 'medium',
    status case_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    next_session TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 8: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS Policies for users
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- STEP 10: Create RLS Policies for legal_queries
CREATE POLICY "Users can view own queries" ON public.legal_queries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON public.legal_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries" ON public.legal_queries
    FOR UPDATE USING (auth.uid() = user_id);

-- STEP 11: Create RLS Policies for legal_guidance
CREATE POLICY "Users can view guidance for own queries" ON public.legal_guidance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legal_queries 
            WHERE legal_queries.id = legal_guidance.query_id 
            AND legal_queries.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert guidance" ON public.legal_guidance
    FOR INSERT WITH CHECK (true);

-- STEP 12: Create RLS Policies for lawyers
CREATE POLICY "Anyone can view lawyers" ON public.lawyers
    FOR SELECT USING (true);

CREATE POLICY "Lawyers can update own profile" ON public.lawyers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Lawyers can insert own profile" ON public.lawyers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STEP 13: Create RLS Policies for mediation_cases
CREATE POLICY "Users can view own mediation cases" ON public.mediation_cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mediation cases" ON public.mediation_cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mediation cases" ON public.mediation_cases
    FOR UPDATE USING (auth.uid() = user_id);

-- STEP 14: Create RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- STEP 15: Insert sample lawyer data
INSERT INTO public.lawyers (name, specialization, experience_years, hourly_rate, location, languages, bio, rating, availability) VALUES
('Sarah Johnson', 'Contract Law', 8, 350.00, 'New York, NY', ARRAY['English', 'Spanish'], 'Experienced contract attorney specializing in business agreements and employment contracts.', 4.9, 'Available this week'),
('Michael Chen', 'Employment Law', 12, 425.00, 'San Francisco, CA', ARRAY['English', 'Mandarin'], 'Employment law expert with extensive experience in workplace disputes and discrimination cases.', 4.8, 'Available next week'),
('Emily Rodriguez', 'Family Law', 6, 275.00, 'Miami, FL', ARRAY['English', 'Spanish'], 'Compassionate family law attorney focusing on divorce, custody, and adoption cases.', 4.7, 'Available today'),
('David Kim', 'Business Law', 15, 550.00, 'Chicago, IL', ARRAY['English', 'Korean'], 'Senior business attorney with expertise in corporate law, mergers, and acquisitions.', 4.9, 'Booking 2 weeks out'),
('Lisa Thompson', 'Criminal Law', 10, 400.00, 'Los Angeles, CA', ARRAY['English'], 'Criminal defense attorney with a strong track record in both state and federal courts.', 4.8, 'Available this week'),
('Robert Martinez', 'Immigration Law', 7, 300.00, 'Houston, TX', ARRAY['English', 'Spanish'], 'Immigration attorney helping families and businesses navigate complex immigration processes.', 4.6, 'Available next week');