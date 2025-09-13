-- Analytics and Monitoring Tables Migration
-- This migration creates tables for storing analytics data and monitoring metrics

-- AI request logs for performance monitoring
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('legal_guidance', 'mediation', 'cultural_adaptation', 'translation')),
    jurisdiction VARCHAR(100),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'error', 'timeout')),
    accuracy DECIMAL(3,2) CHECK (accuracy >= 0 AND accuracy <= 1),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    token_usage JSONB,
    error_details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI performance alerts
CREATE TABLE IF NOT EXISTS ai_performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
    details JSONB NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User actions for analytics tracking
CREATE TABLE IF NOT EXISTS user_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for engagement tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Lawyer matches for analytics
CREATE TABLE IF NOT EXISTS lawyer_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    lawyer_id UUID REFERENCES lawyers(id),
    query_id UUID REFERENCES legal_queries(id),
    matching_criteria JSONB NOT NULL,
    match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
    status VARCHAR(50) DEFAULT 'matched' CHECK (status IN ('matched', 'consultation_requested', 'consultation_booked', 'consultation_completed', 'declined')),
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lawyer ratings for quality tracking
CREATE TABLE IF NOT EXISTS lawyer_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID REFERENCES lawyers(id),
    user_id UUID REFERENCES users(id),
    match_id UUID REFERENCES lawyer_matches(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    response_time_rating INTEGER CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription payments for revenue tracking
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subscription_id UUID,
    plan_type VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    payment_provider_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lawyer commissions for revenue tracking
CREATE TABLE IF NOT EXISTS lawyer_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID REFERENCES lawyers(id),
    match_id UUID REFERENCES lawyer_matches(id),
    consultation_fee DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(3,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
    commission_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'paid', 'disputed')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal guidance for accuracy tracking
CREATE TABLE IF NOT EXISTS legal_guidance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES legal_queries(id),
    guidance_steps JSONB NOT NULL,
    applicable_laws JSONB,
    cultural_considerations JSONB,
    next_actions JSONB,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    response_time_ms INTEGER,
    ai_model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for compliance and security
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_service_type ON ai_request_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created_at ON ai_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_status ON ai_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_jurisdiction ON ai_request_logs(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action ON user_actions(action);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_lawyer_matches_user_id ON lawyer_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_matches_lawyer_id ON lawyer_matches(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_matches_status ON lawyer_matches(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_matches_created_at ON lawyer_matches(created_at);

CREATE INDEX IF NOT EXISTS idx_lawyer_ratings_lawyer_id ON lawyer_ratings(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_ratings_rating ON lawyer_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_lawyer_ratings_created_at ON lawyer_ratings(created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_at ON subscription_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_plan_type ON subscription_payments(plan_type);

CREATE INDEX IF NOT EXISTS idx_lawyer_commissions_lawyer_id ON lawyer_commissions(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_commissions_status ON lawyer_commissions(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_commissions_created_at ON lawyer_commissions(created_at);

CREATE INDEX IF NOT EXISTS idx_legal_guidance_query_id ON legal_guidance(query_id);
CREATE INDEX IF NOT EXISTS idx_legal_guidance_confidence ON legal_guidance(confidence);
CREATE INDEX IF NOT EXISTS idx_legal_guidance_created_at ON legal_guidance(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_actions
FROM user_actions 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW ai_performance_summary AS
SELECT 
    service_type,
    jurisdiction,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
    AVG(duration_ms) as avg_duration_ms,
    AVG(accuracy) FILTER (WHERE accuracy IS NOT NULL) as avg_accuracy
FROM ai_request_logs 
GROUP BY service_type, jurisdiction, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    SUM(amount) FILTER (WHERE status = 'completed') as subscription_revenue,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
FROM subscription_payments 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;