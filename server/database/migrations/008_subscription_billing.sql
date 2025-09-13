-- Subscription and Billing System Migration

-- Service tiers enum
CREATE TYPE service_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    tier service_tier NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- One active subscription per user
);

-- Usage tracking table
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'legal_queries', 'ai_guidance', 'lawyer_matches', 'mediation_cases'
    usage_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_type, period_start)
);

-- Billing transactions table
CREATE TABLE billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('subscription', 'commission', 'refund', 'adjustment')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commission tracking table
CREATE TABLE commission_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_type VARCHAR(20) NOT NULL CHECK (referral_type IN ('consultation', 'case_referral', 'mediation')),
    commission_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.1500 for 15%
    gross_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
    payment_date TIMESTAMP WITH TIME ZONE,
    stripe_transfer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- White-label configurations table
CREATE TABLE white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    custom_domain VARCHAR(255),
    branding JSONB NOT NULL DEFAULT '{}', -- logo, colors, fonts, etc.
    features JSONB NOT NULL DEFAULT '{}', -- enabled/disabled features
    billing_config JSONB NOT NULL DEFAULT '{}', -- commission rates, payment settings
    admin_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, features, limits) VALUES
('Free Tier', 'free', 0.00, 0.00, 
 '{"ai_guidance": true, "basic_lawyer_search": true, "community_support": true}',
 '{"legal_queries_per_month": 3, "ai_guidance_per_month": 5, "lawyer_matches_per_month": 2}'),
 
('Basic Plan', 'basic', 29.99, 299.99,
 '{"ai_guidance": true, "lawyer_matching": true, "priority_support": true, "basic_mediation": true}',
 '{"legal_queries_per_month": 25, "ai_guidance_per_month": 50, "lawyer_matches_per_month": 10, "mediation_cases_per_month": 2}'),
 
('Premium Plan', 'premium', 99.99, 999.99,
 '{"ai_guidance": true, "lawyer_matching": true, "priority_support": true, "full_mediation": true, "document_storage": true, "analytics": true}',
 '{"legal_queries_per_month": 100, "ai_guidance_per_month": 200, "lawyer_matches_per_month": 50, "mediation_cases_per_month": 10, "document_storage_gb": 10}'),
 
('Enterprise Plan', 'enterprise', 299.99, 2999.99,
 '{"ai_guidance": true, "lawyer_matching": true, "priority_support": true, "full_mediation": true, "document_storage": true, "analytics": true, "white_label": true, "api_access": true}',
 '{"legal_queries_per_month": -1, "ai_guidance_per_month": -1, "lawyer_matches_per_month": -1, "mediation_cases_per_month": -1, "document_storage_gb": 100}');

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_resource_type ON usage_tracking(resource_type);
CREATE INDEX idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX idx_billing_transactions_user_id ON billing_transactions(user_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX idx_commission_tracking_lawyer_id ON commission_tracking(lawyer_id);
CREATE INDEX idx_commission_tracking_status ON commission_tracking(status);
CREATE INDEX idx_white_label_configs_subdomain ON white_label_configs(subdomain);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_transactions_updated_at BEFORE UPDATE ON billing_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_tracking_updated_at BEFORE UPDATE ON commission_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_white_label_configs_updated_at BEFORE UPDATE ON white_label_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();