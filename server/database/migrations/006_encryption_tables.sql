-- Migration 006: Add encryption and secure communication tables

-- Table for storing user key pairs for end-to-end encryption
CREATE TABLE IF NOT EXISTS user_key_pairs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL, -- Encrypted with user's password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for secure encrypted messages between users
CREATE TABLE IF NOT EXISTS secure_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL, -- Message encrypted with recipient's public key
    signature TEXT NOT NULL, -- Message signed with sender's private key
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'document', 'legal_advice', 'mediation_update')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for encrypted sensitive data storage
CREATE TABLE IF NOT EXISTS encrypted_data_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL, -- 'user', 'legal_query', 'mediation_case', etc.
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_method VARCHAR(50) DEFAULT 'aes-256-gcm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id, field_name)
);

-- Table for data anonymization tracking
CREATE TABLE IF NOT EXISTS anonymized_data_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_entity_type VARCHAR(100) NOT NULL,
    original_entity_id UUID NOT NULL,
    anonymized_id VARCHAR(100) NOT NULL,
    anonymization_method VARCHAR(50) DEFAULT 'sha256',
    anonymized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retention_period_days INTEGER DEFAULT 2555, -- 7 years default
    scheduled_deletion_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Table for audit logging of data access
CREATE TABLE IF NOT EXISTS data_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'encrypt', 'decrypt', 'anonymize')),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    additional_metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_messages_sender ON secure_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_recipient ON secure_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_secure_messages_timestamp ON secure_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_secure_messages_conversation ON secure_messages(sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_encrypted_data_entity ON encrypted_data_store(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_data_field ON encrypted_data_store(entity_type, entity_id, field_name);

CREATE INDEX IF NOT EXISTS idx_anonymized_data_original ON anonymized_data_log(original_entity_type, original_entity_id);
CREATE INDEX IF NOT EXISTS idx_anonymized_data_scheduled_deletion ON anonymized_data_log(scheduled_deletion_at) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON data_access_audit(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON data_access_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON data_access_audit(timestamp);

-- Add encryption status columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_anonymized BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonymization_date TIMESTAMP;

ALTER TABLE legal_queries ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_queries ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100);

ALTER TABLE mediation_cases ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE mediation_cases ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_user_key_pairs_updated_at 
    BEFORE UPDATE ON user_key_pairs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encrypted_data_store_updated_at 
    BEFORE UPDATE ON encrypted_data_store 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to schedule data deletion based on retention policy
CREATE OR REPLACE FUNCTION schedule_data_deletion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.scheduled_deletion_at = NEW.anonymized_at + INTERVAL '1 day' * NEW.retention_period_days;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically schedule deletion
CREATE TRIGGER schedule_anonymized_data_deletion 
    BEFORE INSERT ON anonymized_data_log 
    FOR EACH ROW EXECUTE FUNCTION schedule_data_deletion();

-- View for active encrypted communications
CREATE OR REPLACE VIEW active_secure_conversations AS
SELECT 
    LEAST(sender_id, recipient_id) as user1_id,
    GREATEST(sender_id, recipient_id) as user2_id,
    COUNT(*) as message_count,
    MAX(timestamp) as last_message_at,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
FROM secure_messages
GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id);

-- View for data access statistics
CREATE OR REPLACE VIEW data_access_statistics AS
SELECT 
    entity_type,
    action,
    DATE_TRUNC('day', timestamp) as access_date,
    COUNT(*) as access_count,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed_attempts
FROM data_access_audit
GROUP BY entity_type, action, DATE_TRUNC('day', timestamp);

-- Comments for documentation
COMMENT ON TABLE user_key_pairs IS 'Stores RSA key pairs for end-to-end encryption between users';
COMMENT ON TABLE secure_messages IS 'Encrypted messages between users with digital signatures';
COMMENT ON TABLE encrypted_data_store IS 'Centralized storage for encrypted sensitive data fields';
COMMENT ON TABLE anonymized_data_log IS 'Tracks data anonymization for privacy compliance';
COMMENT ON TABLE data_access_audit IS 'Comprehensive audit log for all data access operations';

COMMENT ON COLUMN user_key_pairs.private_key_encrypted IS 'Private key encrypted with user password using AES-256';
COMMENT ON COLUMN secure_messages.encrypted_content IS 'Message content encrypted with recipient public key';
COMMENT ON COLUMN secure_messages.signature IS 'Digital signature created with sender private key';
COMMENT ON COLUMN anonymized_data_log.retention_period_days IS 'Number of days to retain anonymized data before deletion';