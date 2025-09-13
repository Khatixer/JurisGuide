-- Migration 007: Add privacy compliance and GDPR tables

-- Table for data subject requests (GDPR Articles 15-22)
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('export', 'delete', 'anonymize', 'rectify', 'restrict')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    request_details JSONB,
    processing_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user consent management (GDPR Article 7)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL, -- e.g., 'marketing', 'analytics', 'data_processing'
    purpose TEXT NOT NULL, -- Clear description of what the consent is for
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    version VARCHAR(20) NOT NULL DEFAULT '1.0', -- Version of consent terms
    legal_basis VARCHAR(100) NOT NULL, -- GDPR legal basis (consent, contract, etc.)
    metadata JSONB, -- Additional consent-related data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, consent_type, version)
);

-- Table for data processing activity log (GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity VARCHAR(100) NOT NULL, -- Type of processing activity
    details JSONB, -- Additional details about the activity
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    legal_basis VARCHAR(100), -- GDPR legal basis for processing
    purpose TEXT -- Purpose of processing
);

-- Table for data exports (GDPR Article 15)
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES data_subject_requests(id) ON DELETE CASCADE,
    export_data JSONB NOT NULL, -- The exported data
    file_path TEXT, -- Path to exported file if stored separately
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    downloaded_at TIMESTAMP,
    download_count INTEGER DEFAULT 0
);

-- Table for data retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'users', 'legal_queries', 'messages'
    retention_period_days INTEGER NOT NULL,
    legal_basis TEXT NOT NULL, -- Legal justification for retention period
    deletion_criteria TEXT NOT NULL, -- Criteria for when data should be deleted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for privacy impact assessments (GDPR Article 35)
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_name VARCHAR(200) NOT NULL,
    data_processing_description TEXT NOT NULL,
    necessity_justification TEXT NOT NULL,
    risk_assessment JSONB NOT NULL, -- Structured risk assessment data
    mitigation_measures JSONB NOT NULL, -- Risk mitigation measures
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    assessor_id UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- Table for data breach incidents (GDPR Article 33-34)
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_title VARCHAR(200) NOT NULL,
    incident_description TEXT NOT NULL,
    breach_type VARCHAR(50) NOT NULL, -- 'confidentiality', 'integrity', 'availability'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    affected_data_types TEXT[] NOT NULL, -- Types of data affected
    affected_users_count INTEGER,
    discovered_at TIMESTAMP NOT NULL,
    reported_at TIMESTAMP,
    contained_at TIMESTAMP,
    resolved_at TIMESTAMP,
    notification_required BOOLEAN DEFAULT FALSE,
    authority_notified BOOLEAN DEFAULT FALSE,
    users_notified BOOLEAN DEFAULT FALSE,
    incident_details JSONB,
    remediation_actions JSONB,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_type ON data_subject_requests(request_type);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_granted ON user_consents(granted);

CREATE INDEX IF NOT EXISTS idx_data_processing_log_user ON data_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_timestamp ON data_processing_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_activity ON data_processing_log(activity);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires ON data_exports(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_status ON data_breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_discovered ON data_breach_incidents(discovered_at);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_data_retention_policies_updated_at 
    BEFORE UPDATE ON data_retention_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old data exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM data_exports WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to cleanup expired exports daily
CREATE OR REPLACE FUNCTION schedule_export_cleanup()
RETURNS void AS $$
BEGIN
    -- This would typically be called by a cron job or scheduled task
    PERFORM cleanup_expired_exports();
END;
$$ language 'plpgsql';

-- Views for privacy compliance reporting

-- View for consent overview
CREATE OR REPLACE VIEW consent_overview AS
SELECT 
    consent_type,
    COUNT(*) as total_consents,
    COUNT(CASE WHEN granted = TRUE THEN 1 END) as granted_count,
    COUNT(CASE WHEN granted = FALSE THEN 1 END) as revoked_count,
    ROUND(
        COUNT(CASE WHEN granted = TRUE THEN 1 END) * 100.0 / COUNT(*), 2
    ) as consent_rate
FROM user_consents
GROUP BY consent_type;

-- View for data subject request statistics
CREATE OR REPLACE VIEW data_subject_request_stats AS
SELECT 
    request_type,
    status,
    COUNT(*) as request_count,
    AVG(EXTRACT(EPOCH FROM (processed_at - requested_at))/3600) as avg_processing_hours
FROM data_subject_requests
WHERE processed_at IS NOT NULL
GROUP BY request_type, status;

-- View for data retention compliance
CREATE OR REPLACE VIEW data_retention_compliance AS
SELECT 
    p.entity_type,
    p.retention_period_days,
    COUNT(CASE WHEN a.scheduled_deletion_at <= CURRENT_TIMESTAMP THEN 1 END) as overdue_deletions,
    COUNT(CASE WHEN a.scheduled_deletion_at > CURRENT_TIMESTAMP THEN 1 END) as pending_deletions
FROM data_retention_policies p
LEFT JOIN anonymized_data_log a ON a.original_entity_type = p.entity_type
WHERE p.is_active = TRUE
GROUP BY p.entity_type, p.retention_period_days;

-- Insert default retention policies
INSERT INTO data_retention_policies (entity_type, retention_period_days, legal_basis, deletion_criteria, is_active)
VALUES 
    ('users', 2555, 'GDPR Article 5(1)(e) - Storage limitation', 'Delete after 7 years of inactivity unless legal obligation requires retention', TRUE),
    ('legal_queries', 2555, 'Legal obligation - statute of limitations', 'Delete after 7 years unless ongoing legal proceedings', TRUE),
    ('mediation_cases', 3650, 'Legal obligation - dispute resolution records', 'Delete after 10 years unless court order requires retention', TRUE),
    ('secure_messages', 1095, 'Legitimate interest - communication records', 'Delete after 3 years unless user requests earlier deletion', TRUE),
    ('audit_logs', 2555, 'Legal obligation - audit trail requirements', 'Delete after 7 years for compliance purposes', TRUE)
ON CONFLICT (entity_type) DO NOTHING;

-- Insert default consent types
INSERT INTO user_consents (id, user_id, consent_type, purpose, granted, legal_basis, version)
SELECT 
    gen_random_uuid(),
    u.id,
    'essential_services',
    'Processing necessary for providing legal guidance services',
    TRUE,
    'contract',
    '1.0'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_consents c 
    WHERE c.user_id = u.id AND c.consent_type = 'essential_services'
);

-- Comments for documentation
COMMENT ON TABLE data_subject_requests IS 'GDPR data subject requests (Articles 15-22)';
COMMENT ON TABLE user_consents IS 'User consent records for GDPR compliance (Article 7)';
COMMENT ON TABLE data_processing_log IS 'Data processing activity log (GDPR Article 30)';
COMMENT ON TABLE data_exports IS 'Data export files for data portability requests';
COMMENT ON TABLE data_retention_policies IS 'Automated data retention and deletion policies';
COMMENT ON TABLE privacy_impact_assessments IS 'Privacy impact assessments (GDPR Article 35)';
COMMENT ON TABLE data_breach_incidents IS 'Data breach incident tracking (GDPR Articles 33-34)';

COMMENT ON COLUMN user_consents.legal_basis IS 'GDPR legal basis: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests';
COMMENT ON COLUMN data_processing_log.legal_basis IS 'GDPR legal basis for this specific processing activity';
COMMENT ON COLUMN data_retention_policies.retention_period_days IS 'Number of days to retain data before deletion';
COMMENT ON COLUMN data_breach_incidents.breach_type IS 'Type of breach: confidentiality, integrity, or availability';