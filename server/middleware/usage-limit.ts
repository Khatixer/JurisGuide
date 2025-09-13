import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription-service';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export interface UsageLimitOptions {
  resourceType: string;
  trackUsage?: boolean;
  usageCount?: number;
}

// Middleware to check usage limits before allowing access to resources
export const checkUsageLimit = (options: UsageLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const { resourceType, trackUsage = true, usageCount = 1 } = options;

      // Check if user has exceeded usage limit
      const hasExceeded = await subscriptionService.checkUsageLimit(userId, resourceType);
      
      if (hasExceeded) {
        return res.status(429).json(errorResponse(
          `Usage limit exceeded for ${resourceType}. Please upgrade your subscription to continue.`,
          { resourceType, limitExceeded: true }
        ));
      }

      // Track usage if enabled
      if (trackUsage) {
        await subscriptionService.trackUsage(userId, resourceType, usageCount);
      }

      next();
    } catch (error) {
      logger.error('Error checking usage limit:', error);
      // Allow request to proceed if usage check fails
      next();
    }
  };
};

// Middleware to check if user has access to premium features
export const requirePremiumFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      // Get user's subscription
      const subscription = await subscriptionService.getUserSubscription(userId);
      
      if (!subscription) {
        return res.status(403).json(errorResponse(
          `Premium feature '${featureName}' requires an active subscription.`,
          { featureName, requiresSubscription: true }
        ));
      }

      // Get subscription plan details
      const plans = await subscriptionService.getSubscriptionPlans();
      const plan = plans.find(p => p.id === subscription.planId);
      
      if (!plan) {
        return res.status(403).json(errorResponse('Invalid subscription plan'));
      }

      // Check if plan includes the required feature
      if (!plan.features[featureName]) {
        return res.status(403).json(errorResponse(
          `Feature '${featureName}' is not available in your current plan. Please upgrade to access this feature.`,
          { featureName, currentPlan: plan.name, requiresUpgrade: true }
        ));
      }

      next();
    } catch (error) {
      logger.error('Error checking premium feature access:', error);
      res.status(500).json(errorResponse('Failed to verify feature access'));
    }
  };
};

// Middleware to check subscription tier
export const requireSubscriptionTier = (minimumTier: 'free' | 'basic' | 'premium' | 'enterprise') => {
  const tierHierarchy = { free: 0, basic: 1, premium: 2, enterprise: 3 };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      // Get user's subscription
      const subscription = await subscriptionService.getUserSubscription(userId);
      
      if (!subscription) {
        // No subscription means free tier
        if (minimumTier === 'free') {
          return next();
        }
        return res.status(403).json(errorResponse(
          `This feature requires at least ${minimumTier} tier subscription.`,
          { requiredTier: minimumTier, currentTier: 'free' }
        ));
      }

      // Get subscription plan details
      const plans = await subscriptionService.getSubscriptionPlans();
      const plan = plans.find(p => p.id === subscription.planId);
      
      if (!plan) {
        return res.status(403).json(errorResponse('Invalid subscription plan'));
      }

      // Check tier hierarchy
      const userTierLevel = tierHierarchy[plan.tier];
      const requiredTierLevel = tierHierarchy[minimumTier];
      
      if (userTierLevel < requiredTierLevel) {
        return res.status(403).json(errorResponse(
          `This feature requires at least ${minimumTier} tier subscription. Your current tier is ${plan.tier}.`,
          { requiredTier: minimumTier, currentTier: plan.tier }
        ));
      }

      next();
    } catch (error) {
      logger.error('Error checking subscription tier:', error);
      res.status(500).json(errorResponse('Failed to verify subscription tier'));
    }
  };
};