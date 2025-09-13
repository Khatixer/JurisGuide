import express from 'express';
import { subscriptionService } from '../services/subscription-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Get all available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    res.json(successResponse(plans, 'Subscription plans retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json(errorResponse('Failed to fetch subscription plans'));
  }
});

// Get user's current subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const subscription = await subscriptionService.getUserSubscription(userId);
    const usage = await subscriptionService.getUserUsage(userId);
    
    res.json(successResponse({ subscription, usage }, 'User subscription retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching user subscription:', error);
    res.status(500).json(errorResponse('Failed to fetch user subscription'));
  }
});

// Create a new subscription
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const { planId, billingCycle } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      planId: { required: true, type: 'string' },
      billingCycle: { required: true, type: 'string', enum: ['monthly', 'yearly'] }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    const subscription = await subscriptionService.createSubscription(userId, planId, billingCycle);
    res.status(201).json(successResponse(subscription, 'Subscription created successfully'));
  } catch (error) {
    logger.error('Error creating subscription:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to create subscription'));
    }
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    await subscriptionService.cancelSubscription(userId);
    res.json(successResponse(null, 'Subscription cancelled successfully'));
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to cancel subscription'));
    }
  }
});

// Check usage limits for a resource
router.get('/usage-limit/:resourceType', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const { resourceType } = req.params;
    const hasExceeded = await subscriptionService.checkUsageLimit(userId, resourceType);
    
    res.json(successResponse({ 
      resourceType, 
      hasExceededLimit: hasExceeded 
    }, 'Usage limit check completed'));
  } catch (error) {
    logger.error('Error checking usage limit:', error);
    res.status(500).json(errorResponse('Failed to check usage limit'));
  }
});

// Track usage (internal endpoint)
router.post('/track-usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const { resourceType, count = 1 } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      resourceType: { required: true, type: 'string' },
      count: { required: false, type: 'number', min: 1 }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    await subscriptionService.trackUsage(userId, resourceType, count);
    res.json(successResponse(null, 'Usage tracked successfully'));
  } catch (error) {
    logger.error('Error tracking usage:', error);
    res.status(500).json(errorResponse('Failed to track usage'));
  }
});

// Create Stripe checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const { planId, billingCycle } = req.body;
    
    // Get plan details
    const plans = await subscriptionService.getSubscriptionPlans();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      return res.status(404).json(errorResponse('Subscription plan not found'));
    }

    if (plan.tier === 'free') {
      return res.status(400).json(errorResponse('Cannot create checkout session for free plan'));
    }

    const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const interval = billingCycle === 'monthly' ? 'month' : 'year';

    // Create Stripe price
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
      recurring: { interval },
      product_data: {
        name: plan.name,
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
      metadata: {
        userId,
        planId,
        billingCycle,
      },
    });

    res.json(successResponse({ sessionId: session.id }, 'Checkout session created successfully'));
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json(errorResponse('Failed to create checkout session'));
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    logger.error('Stripe webhook secret not configured');
    return res.status(500).json(errorResponse('Webhook configuration error'));
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).json(errorResponse('Invalid webhook signature'));
  }

  try {
    await subscriptionService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json(errorResponse('Webhook processing failed'));
  }
});

export default router;