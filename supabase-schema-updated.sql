-- JurisGuide Platform Database Schema for Supabase
-- Updated schema for Next.js implementation
-- Run this in your Supabase SQL Editor

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin');
CREATE TYPE case_status AS ENUM ('pending', 'active', 'resolved', 'cancelled');
CREATE TYPE message_sender_type AS ENUM ('user', 'ai_mediator');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cases table for mediation cases
CREATE TABLE public.cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status case_status DEFAULT 'pending',
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case participants table (many-to-many relationship)
CREATE TABLE public.case_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- For invited participants who haven't signed up yet
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_id, email)
);

-- Messages table for real-time mediation communication
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_type message_sender_type DEFAULT 'user',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_cases_created_by ON public.cases(created_by);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_case_participants_case_id ON public.case_participants(case_id);
CREATE INDEX idx_case_participants_user_id ON public.case_participants(user_id);
CREATE INDEX idx_case_participants_email ON public.case_participants(email);
CREATE INDEX idx_messages_case_id ON public.messages(case_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for cases
CREATE POLICY "Users can view cases they participate in" ON public.cases
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.case_participants 
            WHERE case_participants.case_id = cases.id 
            AND case_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create cases" ON public.cases
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Case creators can update their cases" ON public.cases
    FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for case_participants
CREATE POLICY "Users can view participants of their cases" ON public.case_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = case_participants.case_id 
            AND (cases.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.case_participants cp2 
                        WHERE cp2.case_id = cases.id AND cp2.user_id = auth.uid()))
        )
    );

CREATE POLICY "Case creators can add participants" ON public.case_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = case_participants.case_id 
            AND cases.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participation" ON public.case_participants
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their cases" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = messages.case_id 
            AND (cases.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.case_participants 
                        WHERE case_participants.case_id = cases.id 
                        AND case_participants.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can send messages in their cases" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = messages.case_id 
            AND (cases.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.case_participants 
                        WHERE case_participants.case_id = cases.id 
                        AND case_participants.user_id = auth.uid()))
        )
    );

-- Allow AI mediator messages to be inserted (system messages)
CREATE POLICY "System can insert AI mediator messages" ON public.messages
    FOR INSERT WITH CHECK (sender_type = 'ai_mediator');

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profile creation trigger for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, country, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'country',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Supabase Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;