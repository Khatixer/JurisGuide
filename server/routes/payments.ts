import express from 'express';
import { PaymentService, ConsultationBooking } from '../services/payment-service';
import { authenticateToken } from '../middleware/auth';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();
const paymentService = new PaymentService();

// Create payment intent for consultation booking
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;
    const userId = (req as any).user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json(createErrorResponse('INVALID_AMOUNT', 'Valid amount is required'));
    }

    // Add user ID to metadata
    metadata.userId = userId;

    const paymentIntent = await paymentService.createPaymentIntent(amount, currency, metadata);

    res.json(createSuccessResponse(paymentIntent));
  } catch (error) {
    logger.error('Failed to create payment intent', undefined, undefined, error);
    res.status(500).json(createErrorResponse('PAYMENT_INTENT_ERROR', 'Failed to create payment intent'));
  }
});

// Create payment for consultation booking
router.post('/consultation-payment', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { 
      lawyerId, 
      consultationType, 
      scheduledAt, 
      duration, 
      amount, 
      currency = 'usd', 
      description 
    } = req.body;

    if (!lawyerId || !consultationType || !scheduledAt || !duration || !amount) {
      return res.status(400).json(createErrorResponse('MISSING_FIELDS', 'All booking fields are required'));
    }

    if (!['initial', 'follow_up', 'emergency'].includes(consultationType)) {
      return res.status(400).json(createErrorResponse('INVALID_CONSULTATION_TYPE', 'Invalid consultation type'));
    }

    const booking: ConsultationBooking = {
      lawyerId,
      userId,
      consultationType,
      scheduledAt: new Date(scheduledAt),
      duration,
      amount,
      currency,
      description: description || `${consultationType} consultation`
    };

    const paymentIntent = await paymentService.createConsultationPayment(booking);

    res.json(createSuccessResponse({
      paymentIntent,
      booking: {
        lawyerId: booking.lawyerId,
        consultationType: booking.consultationType,
        scheduledAt: booking.scheduledAt,
        duration: booking.duration,
        amount: booking.amount,
        currency: booking.currency
      }
    }));
  } catch (error) {
    logger.error('Failed to create consultation payment', undefined, undefined, error);
    res.status(500).json(createErrorResponse('CONSULTATION_PAYMENT_ERROR', 'Failed to create consultation payment'));
  }
});

// Confirm payment
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json(createErrorResponse('MISSING_PAYMENT_INTENT', 'Payment intent ID is required'));
    }

    const result = await paymentService.confirmPayment(paymentIntentId);

    if (result.success) {
      res.json(createSuccessResponse(result));
    } else {
      res.status(400).json(createErrorResponse('PAYMENT_CONFIRMATION_FAILED', result.error || 'Payment confirmation failed'));
    }
  } catch (error) {
    logger.error('Failed to confirm payment', undefined, undefined, error);
    res.status(500).json(createErrorResponse('PAYMENT_CONFIRMATION_ERROR', 'Failed to confirm payment'));
  }
});

// Process refund
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json(createErrorResponse('MISSING_PAYMENT_INTENT', 'Payment intent ID is required'));
    }

    if (!['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason)) {
      return res.status(400).json(createErrorResponse('INVALID_REASON', 'Invalid refund reason'));
    }

    const result = await paymentService.processRefund(paymentIntentId, amount, reason);

    if (result.success) {
      res.json(createSuccessResponse(result));
    } else {
      res.status(400).json(createErrorResponse('REFUND_FAILED', result.error || 'Refund processing failed'));
    }
  } catch (error) {
    logger.error('Failed to process refund', undefined, undefined, error);
    res.status(500).json(createErrorResponse('REFUND_ERROR', 'Failed to process refund'));
  }
});

// Create customer
router.post('/create-customer', authenticateToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = (req as any).user.id;

    if (!email) {
      return res.status(400).json(createErrorResponse('MISSING_EMAIL', 'Email is required'));
    }

    const customerId = await paymentService.createCustomer(email, name);

    res.json(createSuccessResponse({
      customerId,
      userId,
      email,
      name
    }));
  } catch (error) {
    logger.error('Failed to create customer', undefined, undefined, error);
    res.status(500).json(createErrorResponse('CUSTOMER_CREATION_ERROR', 'Failed to create customer'));
  }
});

// Attach payment method
router.post('/attach-payment-method', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId, customerId } = req.body;

    if (!paymentMethodId || !customerId) {
      return res.status(400).json(createErrorResponse('MISSING_FIELDS', 'Payment method ID and customer ID are required'));
    }

    const paymentMethod = await paymentService.attachPaymentMethod(paymentMethodId, customerId);

    res.json(createSuccessResponse(paymentMethod));
  } catch (error) {
    logger.error('Failed to attach payment method', undefined, undefined, error);
    res.status(500).json(createErrorResponse('PAYMENT_METHOD_ERROR', 'Failed to attach payment method'));
  }
});

// Get customer payment methods
router.get('/payment-methods/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;

    const paymentMethods = await paymentService.getCustomerPaymentMethods(customerId);

    res.json(createSuccessResponse(paymentMethods));
  } catch (error) {
    logger.error('Failed to get payment methods', undefined, undefined, error);
    res.status(500).json(createErrorResponse('PAYMENT_METHODS_ERROR', 'Failed to get payment methods'));
  }
});

// Calculate consultation fee
router.post('/calculate-fee', authenticateToken, async (req, res) => {
  try {
    const { lawyerId, consultationType, duration } = req.body;

    if (!lawyerId || !consultationType || !duration) {
      return res.status(400).json(createErrorResponse('MISSING_FIELDS', 'Lawyer ID, consultation type, and duration are required'));
    }

    if (!['initial', 'follow_up', 'emergency'].includes(consultationType)) {
      return res.status(400).json(createErrorResponse('INVALID_CONSULTATION_TYPE', 'Invalid consultation type'));
    }

    const feeCalculation = await paymentService.calculateConsultationFee(lawyerId, consultationType, duration);

    res.json(createSuccessResponse(feeCalculation));
  } catch (error) {
    logger.error('Failed to calculate consultation fee', undefined, undefined, error);
    res.status(500).json(createErrorResponse('FEE_CALCULATION_ERROR', 'Failed to calculate consultation fee'));
  }
});

// Create setup intent for saving payment methods
router.post('/create-setup-intent', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json(createErrorResponse('MISSING_CUSTOMER_ID', 'Customer ID is required'));
    }

    const setupIntent = await paymentService.createSetupIntent(customerId);

    res.json(createSuccessResponse(setupIntent));
  } catch (error) {
    logger.error('Failed to create setup intent', undefined, undefined, error);
    res.status(500).json(createErrorResponse('SETUP_INTENT_ERROR', 'Failed to create setup intent'));
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body.toString();

    if (!signature) {
      return res.status(400).json(createErrorResponse('MISSING_SIGNATURE', 'Stripe signature is required'));
    }

    const event = await paymentService.validateWebhook(payload, signature);
    
    if (!event) {
      return res.status(400).json(createErrorResponse('INVALID_WEBHOOK', 'Invalid webhook signature'));
    }

    await paymentService.handleWebhookEvent(event);

    res.json(createSuccessResponse({ received: true }));
  } catch (error) {
    logger.error('Webhook processing error', undefined, undefined, error);
    res.status(500).json(createErrorResponse('WEBHOOK_ERROR', 'Failed to process webhook'));
  }
});

export default router;