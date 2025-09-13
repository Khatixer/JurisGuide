import { Pool } from 'pg';
import { pool } from '../database/config';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any>;
  limits: Record<string, number>;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  resourceType: string;
  usageCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export class SubscriptionService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // Get all available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const query = `
        SELECT id, name, tier, price_monthly as "priceMonthly", 
               price_yearly as "priceYearly", features, limits, is_active as "isActive"
        FROM subscription_plans 
        WHERE is_active = true 
        ORDER BY price_monthly ASC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching subscription plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const query = `
        SELECT us.id, us.user_id as "userId", us.plan_id as "planId", 
               us.status, us.billing_cycle as "billingCycle",
               us.current_period_start as "currentPeriodStart",
               us.current_period_end as "currentPeriodEnd",
               us.stripe_subscription_id as "stripeSubscriptionId",
               us.stripe_customer_id as "stripeCustomerId"
        FROM user_subscriptions us
        WHERE us.user_id = $1 AND us.status = 'active'
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching user subscription:', error);
      throw new Error('Failed to fetch user subscription');
    }
  }

  // Create a new subscription
  async createSubscription(
    userId: string, 
    planId: string, 
    billingCycle: 'monthly' | 'yearly'
  ): Promise<UserSubscription> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get plan details
      const planQuery = `SELECT * FROM subscription_plans WHERE id = $1`;
      const planResult = await client.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Check if user already has an active subscription
      const existingQuery = `
        SELECT id FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'active'
      `;
      const existingResult = await client.query(existingQuery, [userId]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('User already has an active subscription');
      }

      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Create Stripe customer and subscription if not free tier
      let stripeCustomerId: string | undefined;
      let stripeSubscriptionId: string | undefined;

      if (plan.tier !== 'free') {
        // Get user details for Stripe customer
        const userQuery = `SELECT email, profile FROM users WHERE id = $1`;
        const userResult = await client.query(userQuery, [userId]);
        const user = userResult.rows[0];

        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId }
        });
        stripeCustomerId = customer.id;

        // Create Stripe price if needed (in production, these would be pre-created)
        const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
        const interval = billingCycle === 'monthly' ? 'month' : 'year';

        const stripePrice = await stripe.prices.create({
          unit_amount: Math.round(price * 100), // Convert to cents
          currency: 'usd',
          recurring: { interval },
          product_data: {
            name: plan.name,
          },
        });

        // Create Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: stripePrice.id }],
          metadata: { userId, planId }
        });
        stripeSubscriptionId = subscription.id;
      }

      // Insert subscription record
      const insertQuery = `
        INSERT INTO user_subscriptions 
        (user_id, plan_id, status, billing_cycle, current_period_start, 
         current_period_end, stripe_subscription_id, stripe_customer_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        userId, planId, 'active', billingCycle, now, periodEnd,
        stripeSubscriptionId, stripeCustomerId
      ];
      
      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      return {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        planId: result.rows[0].plan_id,
        status: result.rows[0].status,
        billingCycle: result.rows[0].billing_cycle,
        currentPeriodStart: result.rows[0].current_period_start,
        currentPeriodEnd: result.rows[0].current_period_end,
        stripeSubscriptionId: result.rows[0].stripe_subscription_id,
        stripeCustomerId: result.rows[0].stripe_customer_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating subscription:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Track resource usage
  async trackUsage(userId: string, resourceType: string, count: number = 1): Promise<void> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const query = `
        INSERT INTO usage_tracking (user_id, resource_type, usage_count, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, resource_type, period_start)
        DO UPDATE SET 
          usage_count = usage_tracking.usage_count + $3,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.db.query(query, [userId, resourceType, count, periodStart, periodEnd]);
    } catch (error) {
      logger.error('Error tracking usage:', error);
      throw new Error('Failed to track usage');
    }
  }

  // Check if user has exceeded usage limits
  async checkUsageLimit(userId: string, resourceType: string): Promise<boolean> {
    try {
      // Get user's subscription and plan limits
      const subscriptionQuery = `
        SELECT sp.limits
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 AND us.status = 'active'
      `;
      
      const subscriptionResult = await this.db.query(subscriptionQuery, [userId]);
      
      if (subscriptionResult.rows.length === 0) {
        // No subscription found, assume free tier with default limits
        const freePlanQuery = `
          SELECT limits FROM subscription_plans WHERE tier = 'free' AND is_active = true
        `;
        const freePlanResult = await this.db.query(freePlanQuery);
        if (freePlanResult.rows.length === 0) {
          return false; // No limits defined
        }
        var limits = freePlanResult.rows[0].limits;
      } else {
        var limits = subscriptionResult.rows[0].limits;
      }

      const limitKey = `${resourceType}_per_month`;
      const monthlyLimit = limits[limitKey];
      
      if (!monthlyLimit || monthlyLimit === -1) {
        return false; // No limit or unlimited
      }

      // Get current month usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const usageQuery = `
        SELECT usage_count
        FROM usage_tracking
        WHERE user_id = $1 AND resource_type = $2 AND period_start = $3
      `;
      
      const usageResult = await this.db.query(usageQuery, [userId, resourceType, periodStart]);
      const currentUsage = usageResult.rows[0]?.usage_count || 0;
      
      return currentUsage >= monthlyLimit;
    } catch (error) {
      logger.error('Error checking usage limit:', error);
      return false; // Allow usage if check fails
    }
  }

  // Get user's current usage for the month
  async getUserUsage(userId: string): Promise<Record<string, number>> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const query = `
        SELECT resource_type, usage_count
        FROM usage_tracking
        WHERE user_id = $1 AND period_start = $2
      `;
      
      const result = await this.db.query(query, [userId, periodStart]);
      
      const usage: Record<string, number> = {};
      result.rows.forEach(row => {
        usage[row.resource_type] = row.usage_count;
      });
      
      return usage;
    } catch (error) {
      logger.error('Error fetching user usage:', error);
      throw new Error('Failed to fetch user usage');
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get current subscription
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel Stripe subscription if exists
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update subscription status
      const updateQuery = `
        UPDATE user_subscriptions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND status = 'active'
      `;
      
      await client.query(updateQuery, [userId]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error cancelling subscription:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Handle Stripe webhook events
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const query = `
        UPDATE user_subscriptions 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $1
      `;
      await this.db.query(query, [invoice.subscription]);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const query = `
        UPDATE user_subscriptions 
        SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $1
      `;
      await this.db.query(query, [invoice.subscription]);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const query = `
      UPDATE user_subscriptions 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = $1
    `;
    await this.db.query(query, [subscription.id]);
  }
}

export const subscriptionService = new SubscriptionService();