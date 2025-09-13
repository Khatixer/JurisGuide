-- Migration: Notification System Tables
-- Description: Create tables for notification preferences, templates, and delivery tracking

-- Add notification preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "sms": false,
  "push": true,
  "realTime": true,
  "frequency": "immediate",
  "categories": []
}'::jsonb;

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'realtime')),
    subject VARCHAR(500),
    template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- Create notification delivery log table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'realtime')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    external_id VARCHAR(255),
    notification_type VARCHAR(100),
    title VARCHAR(500),
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user_id ON notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_sent_at ON notification_delivery_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_external_id ON notification_delivery_log(external_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Insert default notification templates
INSERT INTO notification_templates (name, type, subject, template, variables) VALUES
(
    'case_update_email',
    'email',
    'Case Update: {{case_title}}',
    'Hello {{user_name}},

Your case "{{case_title}}" has been updated.

**Update Details:**
{{update_details}}

**Next Steps:**
{{next_steps}}

You can view the full details by logging into your JurisGuide account.

Best regards,
The JurisGuide Team',
    ARRAY['user_name', 'case_title', 'update_details', 'next_steps']
),
(
    'case_update_sms',
    'sms',
    NULL,
    'JurisGuide: Your case "{{case_title}}" has been updated. {{short_update}}',
    ARRAY['case_title', 'short_update']
),
(
    'lawyer_response_email',
    'email',
    'New Response from {{lawyer_name}}',
    'Hello {{user_name}},

{{lawyer_name}} has responded to your legal query.

**Response:**
{{response_content}}

**Lawyer Details:**
- Name: {{lawyer_name}}
- Specialization: {{lawyer_specialization}}
- Rating: {{lawyer_rating}}/5

You can continue the conversation by logging into your JurisGuide account.

Best regards,
The JurisGuide Team',
    ARRAY['user_name', 'lawyer_name', 'response_content', 'lawyer_specialization', 'lawyer_rating']
),
(
    'lawyer_response_sms',
    'sms',
    NULL,
    'JurisGuide: {{lawyer_name}} responded to your query. Check your account for details.',
    ARRAY['lawyer_name']
),
(
    'mediation_update_email',
    'email',
    'Mediation Update: {{case_title}}',
    'Hello {{user_name}},

There has been an update in your mediation case "{{case_title}}".

**Update Type:** {{update_type}}
**Details:** {{update_details}}

**Current Status:** {{mediation_status}}

{{#if next_session}}
**Next Session:** {{next_session_date}} at {{next_session_time}}
{{/if}}

Please log into your account to view the complete mediation timeline.

Best regards,
The JurisGuide Mediation Team',
    ARRAY['user_name', 'case_title', 'update_type', 'update_details', 'mediation_status', 'next_session_date', 'next_session_time']
),
(
    'payment_confirmation_email',
    'email',
    'Payment Confirmation - {{service_name}}',
    'Hello {{user_name}},

Your payment has been successfully processed.

**Payment Details:**
- Service: {{service_name}}
- Amount: ${{amount}}
- Transaction ID: {{transaction_id}}
- Date: {{payment_date}}

{{#if lawyer_name}}
- Lawyer: {{lawyer_name}}
{{/if}}

A receipt has been sent to your email address. You can also view your payment history in your JurisGuide account.

Thank you for using JurisGuide!

Best regards,
The JurisGuide Team',
    ARRAY['user_name', 'service_name', 'amount', 'transaction_id', 'payment_date', 'lawyer_name']
),
(
    'system_alert_email',
    'email',
    'JurisGuide System Alert: {{alert_title}}',
    'Hello {{user_name}},

{{alert_message}}

{{#if action_required}}
**Action Required:** {{action_details}}
{{/if}}

{{#if deadline}}
**Deadline:** {{deadline}}
{{/if}}

If you have any questions, please contact our support team.

Best regards,
The JurisGuide Team',
    ARRAY['user_name', 'alert_title', 'alert_message', 'action_details', 'deadline']
);

-- Create function to update notification preferences timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification templates
CREATE TRIGGER update_notification_templates_timestamp
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_timestamp();

-- Add phone number to user profile if not exists
DO $$
BEGIN
    -- Check if we need to add phone to user profiles
    -- This is a safe operation that won't affect existing data
    PERFORM 1;
END $$;

-- Create view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    user_id,
    channel,
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', sent_at) as date
FROM notification_delivery_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, channel, status, DATE_TRUNC('day', sent_at);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notification_templates TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON notification_delivery_log TO PUBLIC;
GRANT SELECT ON notification_stats TO PUBLIC;