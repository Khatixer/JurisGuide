import { SubscriptionService } from '../../services/subscription-service';
import { pool } from '../../database/config';
import { jest } from '@jest/globals';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_test123' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test123' })
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let testUserId: string;
  let testPlanId: string;

  beforeAll(async () => {
    subscriptionService = new SubscriptionService();
    
    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, profile, preferences)
      VALUES ('test@example.com', 'hashedpassword', '{}', '{}')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;
    
    // Get a test plan ID
    const planResult = await pool.query(`
      SELECT id FROM subscription_plans WHERE tier = 'basic' LIMIT 1
    `);
    testPlanId = planResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_subscriptions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM usage_tracking WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up any existing subscriptions for test user
    await pool.query('DELETE FROM user_subscriptions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM usage_tracking WHERE user_id = $1', [testUserId]);
  });

  describe('getSubscriptionPlans', () => {
    it('should return all active subscription plans', async () => {
      const plans = await subscriptionService.getSubscriptionPlans();
      
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      
      // Check that all plans have required properties
      plans.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('tier');
        expect(plan).toHaveProperty('priceMonthly');
        expect(plan).toHaveProperty('priceYearly');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('limits');
        expect(plan.isActive).toBe(true);
      });
    });
  });

  describe('getUserSubscription', () => {
    it('should return null when user has no subscription', async () => {
      const subscription = await subscriptionService.getUserSubscription(testUserId);
      expect(subscription).toBeNull();
    });

    it('should return subscription when user has active subscription', async () => {
      // Create a subscription first
      await subscriptionService.createSubscription(testUserId, testPlanId, 'monthly');
      
      const subscription = await subscriptionService.getUserSubscription(testUserId);
      
      expect(subscription).toBeDefined();
      expect(subscription?.userId).toBe(testUserId);
      expect(subscription?.planId).toBe(testPlanId);
      expect(subscription?.status).toBe('active');
      expect(subscription?.billingCycle).toBe('monthly');
    });
  });

  describe('createSubscription', () => {
    it('should create a free tier subscription successfully', async () => {
      // Get free plan ID
      const freePlanResult = await pool.query(`
        SELECT id FROM subscription_plans WHERE tier = 'free' LIMIT 1
      `);
      const freePlanId = freePlanResult.rows[0].id;
      
      const subscription = await subscriptionService.createSubscription(
        testUserId, 
        freePlanId, 
        'monthly'
      );
      
      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(testUserId);
      expect(subscription.planId).toBe(freePlanId);
      expect(subscription.status).toBe('active');
      expect(subscription.billingCycle).toBe('monthly');
      expect(subscription.stripeSubscriptionId).toBeUndefined();
    });

    it('should create a paid subscription with Stripe integration', async () => {
      const subscription = await subscriptionService.createSubscription(
        testUserId, 
        testPlanId, 
        'monthly'
      );
      
      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(testUserId);
      expect(subscription.planId).toBe(testPlanId);
      expect(subscription.status).toBe('active');
      expect(subscription.billingCycle).toBe('monthly');
      expect(subscription.stripeSubscriptionId).toBe('sub_test123');
      expect(subscription.stripeCustomerId).toBe('cus_test123');
    });

    it('should throw error when user already has active subscription', async () => {
      // Create first subscription
      await subscriptionService.createSubscription(testUserId, testPlanId, 'monthly');
      
      // Try to create second subscription
      await expect(
        subscriptionService.createSubscription(testUserId, testPlanId, 'yearly')
      ).rejects.toThrow('User already has an active subscription');
    });

    it('should throw error when plan does not exist', async () => {
      const nonExistentPlanId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        subscriptionService.createSubscription(testUserId, nonExistentPlanId, 'monthly')
      ).rejects.toThrow('Subscription plan not found');
    });
  });

  describe('trackUsage', () => {
    it('should track usage for new resource type', async () => {
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 1);
      
      const usage = await subscriptionService.getUserUsage(testUserId);
      expect(usage.legal_queries).toBe(1);
    });

    it('should increment usage for existing resource type', async () => {
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 2);
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 3);
      
      const usage = await subscriptionService.getUserUsage(testUserId);
      expect(usage.legal_queries).toBe(5);
    });

    it('should track multiple resource types separately', async () => {
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 2);
      await subscriptionService.trackUsage(testUserId, 'ai_guidance', 3);
      
      const usage = await subscriptionService.getUserUsage(testUserId);
      expect(usage.legal_queries).toBe(2);
      expect(usage.ai_guidance).toBe(3);
    });
  });

  describe('checkUsageLimit', () => {
    it('should return false when user has no subscription (free tier)', async () => {
      // Track some usage first
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 2);
      
      const hasExceeded = await subscriptionService.checkUsageLimit(testUserId, 'legal_queries');
      expect(hasExceeded).toBe(false);
    });

    it('should return true when free tier limit is exceeded', async () => {
      // Track usage beyond free tier limit (3 legal queries per month)
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 4);
      
      const hasExceeded = await subscriptionService.checkUsageLimit(testUserId, 'legal_queries');
      expect(hasExceeded).toBe(true);
    });

    it('should return false when paid subscription has unlimited usage', async () => {
      // Create enterprise subscription (unlimited usage)
      const enterprisePlanResult = await pool.query(`
        SELECT id FROM subscription_plans WHERE tier = 'enterprise' LIMIT 1
      `);
      const enterprisePlanId = enterprisePlanResult.rows[0].id;
      
      await subscriptionService.createSubscription(testUserId, enterprisePlanId, 'monthly');
      
      // Track high usage
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 1000);
      
      const hasExceeded = await subscriptionService.checkUsageLimit(testUserId, 'legal_queries');
      expect(hasExceeded).toBe(false);
    });
  });

  describe('getUserUsage', () => {
    it('should return empty object when user has no usage', async () => {
      const usage = await subscriptionService.getUserUsage(testUserId);
      expect(usage).toEqual({});
    });

    it('should return current month usage only', async () => {
      await subscriptionService.trackUsage(testUserId, 'legal_queries', 5);
      await subscriptionService.trackUsage(testUserId, 'ai_guidance', 10);
      
      const usage = await subscriptionService.getUserUsage(testUserId);
      expect(usage).toEqual({
        legal_queries: 5,
        ai_guidance: 10
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      // Create subscription first
      await subscriptionService.createSubscription(testUserId, testPlanId, 'monthly');
      
      // Cancel subscription
      await subscriptionService.cancelSubscription(testUserId);
      
      // Verify subscription is cancelled
      const subscription = await subscriptionService.getUserSubscription(testUserId);
      expect(subscription).toBeNull(); // No active subscription
      
      // Check that subscription record exists but is cancelled
      const cancelledResult = await pool.query(`
        SELECT status FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'cancelled'
      `, [testUserId]);
      expect(cancelledResult.rows.length).toBe(1);
    });

    it('should throw error when no active subscription exists', async () => {
      await expect(
        subscriptionService.cancelSubscription(testUserId)
      ).rejects.toThrow('No active subscription found');
    });
  });
});