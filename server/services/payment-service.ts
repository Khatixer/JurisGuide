import Stripe from 'stripe';
import { logger } from '../utils/logger';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface ConsultationBooking {
  lawyerId: string;
  userId: string;
  consultationType: 'initial' | 'follow_up' | 'emergency';
  scheduledAt: Date;
  duration: number; // in minutes
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  refundId?: string;
}

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil'
    });
  }

  async createPaymentIntent(
    amount: number, 
    currency: string = 'usd',
    metadata: Record<string, string> = {}
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });

      logger.info('Payment intent created', undefined, undefined, { 
        paymentIntentId: paymentIntent.id, 
        amount, 
        currency 
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      logger.error('Failed to create payment intent', undefined, undefined, error);
      throw new Error('Failed to create payment intent');
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        logger.info('Payment confirmed', undefined, undefined, { paymentIntentId });
        return {
          success: true,
          paymentIntentId
        };
      } else {
        logger.warn('Payment not succeeded', undefined, undefined, { 
          paymentIntentId, 
          status: paymentIntent.status 
        });
        return {
          success: false,
          error: `Payment status: ${paymentIntent.status}`
        };
      }
    } catch (error) {
      logger.error('Failed to confirm payment', undefined, undefined, error);
      return {
        success: false,
        error: 'Failed to confirm payment'
      };
    }
  }

  async createConsultationPayment(booking: ConsultationBooking): Promise<PaymentIntent> {
    const metadata = {
      lawyerId: booking.lawyerId,
      userId: booking.userId,
      consultationType: booking.consultationType,
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration.toString()
    };

    return this.createPaymentIntent(
      booking.amount,
      booking.currency,
      metadata
    );
  }

  async processRefund(
    paymentIntentId: string, 
    amount?: number,
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 'requested_by_customer'
  ): Promise<PaymentResult> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);

      logger.info('Refund processed', undefined, undefined, { 
        paymentIntentId, 
        refundId: refund.id, 
        amount: refund.amount / 100 
      });

      return {
        success: true,
        refundId: refund.id,
        paymentIntentId
      };
    } catch (error) {
      logger.error('Failed to process refund', undefined, undefined, error);
      return {
        success: false,
        error: 'Failed to process refund'
      };
    }
  }

  async createCustomer(email: string, name?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name
      });

      logger.info('Customer created', undefined, undefined, { customerId: customer.id, email });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create customer', undefined, undefined, error);
      throw new Error('Failed to create customer');
    }
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      logger.info('Payment method attached', undefined, undefined, { 
        paymentMethodId, 
        customerId 
      });

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        } : undefined
      };
    } catch (error) {
      logger.error('Failed to attach payment method', undefined, undefined, error);
      throw new Error('Failed to attach payment method');
    }
  }

  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : undefined
      }));
    } catch (error) {
      logger.error('Failed to get customer payment methods', undefined, undefined, error);
      throw new Error('Failed to get payment methods');
    }
  }

  async calculateConsultationFee(
    lawyerId: string, 
    consultationType: 'initial' | 'follow_up' | 'emergency',
    duration: number
  ): Promise<{ amount: number; currency: string; breakdown: any }> {
    // This would integrate with the lawyer service to get pricing
    // For now, this is a placeholder implementation
    
    const baseFees = {
      initial: 200,
      follow_up: 150,
      emergency: 300
    };

    const hourlyRate = 350; // This would come from lawyer's pricing
    const baseFee = baseFees[consultationType];
    
    // Calculate based on duration (minimum 30 minutes)
    const billableMinutes = Math.max(duration, 30);
    const hourlyAmount = (hourlyRate / 60) * billableMinutes;
    
    const totalAmount = baseFee + hourlyAmount;

    return {
      amount: totalAmount,
      currency: 'usd',
      breakdown: {
        baseFee,
        hourlyRate,
        billableMinutes,
        hourlyAmount,
        totalAmount
      }
    };
  }

  async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card']
      });

      return {
        clientSecret: setupIntent.client_secret!
      };
    } catch (error) {
      logger.error('Failed to create setup intent', undefined, undefined, error);
      throw new Error('Failed to create setup intent');
    }
  }

  async validateWebhook(payload: string, signature: string): Promise<Stripe.Event | null> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured');
      return null;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      logger.info('Webhook validated', undefined, undefined, { eventType: event.type });
      return event;
    } catch (error) {
      logger.error('Webhook validation failed', undefined, undefined, error);
      return null;
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logger.info('Payment succeeded', undefined, undefined, { 
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100
          });
          // Handle successful payment (e.g., confirm booking, send notifications)
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          logger.warn('Payment failed', undefined, undefined, { 
            paymentIntentId: failedPayment.id,
            lastPaymentError: failedPayment.last_payment_error
          });
          // Handle failed payment (e.g., notify user, cancel booking)
          break;

        case 'customer.subscription.created':
          const subscription = event.data.object as Stripe.Subscription;
          logger.info('Subscription created', undefined, undefined, { 
            subscriptionId: subscription.id,
            customerId: subscription.customer
          });
          // Handle new subscription
          break;

        default:
          logger.info('Unhandled webhook event', undefined, undefined, { eventType: event.type });
      }
    } catch (error) {
      logger.error('Error handling webhook event', undefined, undefined, error);
      throw error;
    }
  }
}