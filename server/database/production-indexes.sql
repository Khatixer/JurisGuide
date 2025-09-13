-- Production Database Optimization and Indexing
-- This file contains all necessary indexes and optimizations for production deployment

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_language ON users USING GIN ((profile->>'preferredLanguage'));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_location ON users USING GIN ((profile->'location'));

-- Legal queries indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_user_id ON legal_queries(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_status ON legal_queries(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_category ON legal_queries(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_urgency ON legal_queries(urgency);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_jurisdiction ON legal_queries USING GIN (jurisdiction);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_created_at ON legal_queries(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_language ON legal_queries(language);

-- Lawyers table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_specializations ON lawyers USING GIN (specializations);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_verification_status ON lawyers(verification_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_location ON lawyers USING GIN ((location));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_availability ON lawyers USING GIN ((availability));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_pricing ON lawyers USING GIN ((pricing));

-- Mediation cases indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mediation_cases_status ON mediation_cases(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mediation_cases_parties ON mediation_cases USING GIN (parties);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mediation_cases_created_at ON mediation_cases(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mediation_cases_dispute_category ON mediation_cases USING GIN ((dispute_details->>'category'));

-- Legal guidance table indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_guidance_query_id ON legal_guidance(query_id) WHERE query_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_guidance_created_at ON legal_guidance(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_guidance_confidence ON legal_guidance(confidence);

-- Lawyer ratings indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyer_ratings_lawyer_id ON lawyer_ratings(lawyer_id) WHERE lawyer_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyer_ratings_rating ON lawyer_ratings(rating);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyer_ratings_created_at ON lawyer_ratings(created_at);

-- Sessions table indexes (for Redis fallback)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Audit logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_user_status ON legal_queries(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_category_urgency ON legal_queries(category, urgency);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_verification_specialization ON lawyers(verification_status) WHERE verification_status = 'verified';

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_queries_description_fts ON legal_queries USING GIN (to_tsvector('english', description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lawyers_profile_fts ON lawyers USING GIN (to_tsvector('english', profile->>'bio'));

-- Partial indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_mediation_cases ON mediation_cases(id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verified_lawyers ON lawyers(id) WHERE verification_status = 'verified';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_legal_queries ON legal_queries(id) WHERE status = 'pending';

-- Database optimization settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();

-- Update table statistics
ANALYZE users;
ANALYZE legal_queries;
ANALYZE lawyers;
ANALYZE mediation_cases;
ANALYZE legal_guidance;
ANALYZE lawyer_ratings;
ANALYZE audit_logs;