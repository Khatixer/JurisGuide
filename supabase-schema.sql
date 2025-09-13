-- JurisGuide Platform Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin');
CREATE TYPE query_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE case_status AS ENUM ('pending', 'active', 'resolved', 'cancelled');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');

-- Users table (extends Supabase auth.users)
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

-- Legal queries table
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

-- Legal guidance table
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

-- Lawyers table
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

-- Mediation cases table
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

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_legal_queries_user_id ON public.legal_queries(user_id);
CREATE INDEX idx_legal_queries_status ON public.legal_queries(status);
CREATE INDEX idx_legal_guidance_query_id ON public.legal_guidance(query_id);
CREATE INDEX idx_lawyers_specialization ON public.lawyers(specialization);
CREATE INDEX idx_lawyers_location ON public.lawyers(location);
CREATE INDEX idx_mediation_cases_user_id ON public.mediation_cases(user_id);
CREATE INDEX idx_mediation_cases_status ON public.mediation_cases(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Legal queries policies
CREATE POLICY "Users can view own queries" ON public.legal_queries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON public.legal_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries" ON public.legal_queries
    FOR UPDATE USING (auth.uid() = user_id);

-- Legal guidance policies
CREATE POLICY "Users can view guidance for own queries" ON public.legal_guidance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.legal_queries 
            WHERE legal_queries.id = legal_guidance.query_id 
            AND legal_queries.user_id = auth.uid()
        )
    );

-- Lawyers policies (public read, own write)
CREATE POLICY "Anyone can view lawyers" ON public.lawyers
    FOR SELECT USING (true);

CREATE POLICY "Lawyers can update own profile" ON public.lawyers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Lawyers can insert own profile" ON public.lawyers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mediation cases policies
CREATE POLICY "Users can view own mediation cases" ON public.mediation_cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mediation cases" ON public.mediation_cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mediation cases" ON public.mediation_cases
    FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_queries_updated_at BEFORE UPDATE ON public.legal_queries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawyers_updated_at BEFORE UPDATE ON public.lawyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mediation_cases_updated_at BEFORE UPDATE ON public.mediation_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO public.lawyers (name, specialization, experience_years, hourly_rate, location, languages, bio, rating, availability) VALUES
('Sarah Johnson', 'Contract Law', 8, 350.00, 'New York, NY', ARRAY['English', 'Spanish'], 'Experienced contract attorney specializing in business agreements and employment contracts.', 4.9, 'Available this week'),
('Michael Chen', 'Employment Law', 12, 425.00, 'San Francisco, CA', ARRAY['English', 'Mandarin'], 'Employment law expert with extensive experience in workplace disputes and discrimination cases.', 4.8, 'Available next week'),
('Emily Rodriguez', 'Family Law', 6, 275.00, 'Miami, FL', ARRAY['English', 'Spanish'], 'Compassionate family law attorney focusing on divorce, custody, and adoption cases.', 4.7, 'Available today'),
('David Kim', 'Business Law', 15, 550.00, 'Chicago, IL', ARRAY['English', 'Korean'], 'Senior business attorney with expertise in corporate law, mergers, and acquisitions.', 4.9, 'Booking 2 weeks out');