-- JurisGuide Platform Initial Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with enhanced profile and preferences
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}',
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Legal queries table
CREATE TABLE legal_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    jurisdiction TEXT[] NOT NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    cultural_context TEXT,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Legal guidance table
CREATE TABLE legal_guidance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id UUID NOT NULL REFERENCES legal_queries(id) ON DELETE CASCADE,
    steps JSONB NOT NULL DEFAULT '[]',
    applicable_laws JSONB NOT NULL DEFAULT '[]',
    cultural_considerations TEXT[],
    next_actions TEXT[],
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lawyers table
CREATE TABLE lawyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile JSONB NOT NULL DEFAULT '{}',
    specializations TEXT[] NOT NULL,
    location JSONB NOT NULL DEFAULT '{}',
    availability JSONB NOT NULL DEFAULT '{}',
    pricing JSONB NOT NULL DEFAULT '{}',
    ratings JSONB NOT NULL DEFAULT '[]',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified', 'pending', 'unverified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mediation cases table
CREATE TABLE mediation_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parties JSONB NOT NULL DEFAULT '[]',
    dispute_details JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'resolved', 'failed', 'escalated')),
    ai_mediator_config JSONB NOT NULL DEFAULT '{}',
    documents JSONB NOT NULL DEFAULT '[]',
    timeline JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mediation events table (for better querying of timeline events)
CREATE TABLE mediation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES mediation_cases(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('message', 'document', 'proposal', 'agreement')),
    content TEXT NOT NULL,
    party VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    case_id UUID REFERENCES mediation_cases(id) ON DELETE CASCADE,
    query_id UUID REFERENCES legal_queries(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lawyer ratings table (normalized from lawyers.ratings JSONB)
CREATE TABLE lawyer_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lawyer_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_legal_queries_user_id ON legal_queries(user_id);
CREATE INDEX idx_legal_queries_status ON legal_queries(status);
CREATE INDEX idx_legal_queries_category ON legal_queries(category);
CREATE INDEX idx_legal_queries_urgency ON legal_queries(urgency);
CREATE INDEX idx_legal_guidance_query_id ON legal_guidance(query_id);
CREATE INDEX idx_lawyers_verification_status ON lawyers(verification_status);
CREATE INDEX idx_lawyers_specializations ON lawyers USING GIN(specializations);
CREATE INDEX idx_mediation_cases_status ON mediation_cases(status);
CREATE INDEX idx_mediation_events_case_id ON mediation_events(case_id);
CREATE INDEX idx_mediation_events_type ON mediation_events(event_type);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_query_id ON documents(query_id);
CREATE INDEX idx_lawyer_ratings_lawyer_id ON lawyer_ratings(lawyer_id);
CREATE INDEX idx_lawyer_ratings_score ON lawyer_ratings(score);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_queries_updated_at BEFORE UPDATE ON legal_queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lawyers_updated_at BEFORE UPDATE ON lawyers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mediation_cases_updated_at BEFORE UPDATE ON mediation_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();