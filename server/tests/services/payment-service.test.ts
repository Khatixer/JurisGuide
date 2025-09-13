import { PaymentService } from '../../services/payment-service';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Set up environment variable for testing
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
    
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn()
      },
      refunds: {
        create: jest.fn()
      },
      customers: {
        create: jest.fn()
      },
      paymentMethods: {
        attach: jest.fn(),
        list: jest.fn()
      },
      setupIntents: {
        create: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    } as any;

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe);
    
    paymentService = new PaymentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 20000, // $200.00 in cents
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

      const result = await paymentService.createPaymentIntent(200, 'usd', { lawyerId: 'lawyer-123' });

      expect(result).toEqual({
        id: 'pi_test_123',
        clientSecret: 'pi_test_123_secret',
        amount: 200, // Converted back to dollars
        currency: 'usd',
        status: 'requires_payment_method'
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 20000, // $200.00 in cents
        currency: 'usd',
        metadata: { lawyerId: 'lawyer-123' },
        automatic_payment_methods: {
          enabled: true
        }
      });
    });

    it('should throw error on Stripe failure', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe error'));

      await expect(paymentService.createPaymentIntent(200))
        .rejects.toThrow('Failed to create payment intent');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm successful payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded'
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent as any);

      const result = await paymentService.confirmPayment('pi_test_123');

      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_test_123'
      });
    });

    it('should handle non-succeeded payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent as any);

      const result = await paymentService.confirmPayment('pi_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Payment status: requires_payment_method'
      });
    });

    it('should handle Stripe errors', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Payment not found'));

      const result = await paymentService.confirmPayment('pi_invalid');

      expect(result).toEqual({
        success: false,
        error: 'Failed to confirm payment'
      });
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 10000, // $100.00 in cents
        payment_intent: 'pi_test_123'
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund as any);

      const result = await paymentService.processRefund('pi_test_123', 100);

      expect(result).toEqual({
        success: true,
        refundId: 're_test_123',
        paymentIntentId: 'pi_test_123'
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 10000, // $100.00 in cents
        reason: 'requested_by_customer'
      });
    });

    it('should handle refund errors', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Refund failed'));

      const result = await paymentService.processRefund('pi_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to process refund'
      });
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test_123'
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const customerId = await paymentService.createCustomer('test@example.com', 'John Doe');

      expect(customerId).toBe('cus_test_123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe'
      });
    });

    it('should throw error on customer creation failure', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Customer creation failed'));

      await expect(paymentService.createCustomer('test@example.com'))
        .rejects.toThrow('Failed to create customer');
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod as any);

      const result = await paymentService.attachPaymentMethod('pm_test_123', 'cus_test_123');

      expect(result).toEqual({
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        }
      });
    });
  });

  describe('getCustomerPaymentMethods', () => {
    it('should get customer payment methods', async () => {
      const mockPaymentMethods = {
        data: [{
          id: 'pm_test_123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        }]
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods as any);

      const result = await paymentService.getCustomerPaymentMethods('cus_test_123');

      expect(result).toEqual([{
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        }
      }]);
    });
  });

  describe('calculateConsultationFee', () => {
    it('should calculate consultation fee correctly', async () => {
      const result = await paymentService.calculateConsultationFee('lawyer-123', 'initial', 60);

      expect(result).toEqual({
        amount: 550, // $200 base + $350 hourly
        currency: 'usd',
        breakdown: {
          baseFee: 200,
          hourlyRate: 350,
          billableMinutes: 60,
          hourlyAmount: 350,
          totalAmount: 550
        }
      });
    });

    it('should apply minimum billing time', async () => {
      const result = await paymentService.calculateConsultationFee('lawyer-123', 'initial', 15);

      expect(result.breakdown.billableMinutes).toBe(30); // Minimum 30 minutes
    });

    it('should calculate different consultation types', async () => {
      const emergencyResult = await paymentService.calculateConsultationFee('lawyer-123', 'emergency', 30);
      const followUpResult = await paymentService.calculateConsultationFee('lawyer-123', 'follow_up', 30);

      expect(emergencyResult.breakdown.baseFee).toBe(300);
      expect(followUpResult.breakdown.baseFee).toBe(150);
    });
  });

  describe('createSetupIntent', () => {
    it('should create setup intent successfully', async () => {
      const mockSetupIntent = {
        client_secret: 'seti_test_123_secret'
      };

      mockStripe.setupIntents.create.mockResolvedValue(mockSetupIntent as any);

      const result = await paymentService.createSetupIntent('cus_test_123');

      expect(result).toEqual({
        clientSecret: 'seti_test_123_secret'
      });
    });
  });

  describe('validateWebhook', () => {
    it('should validate webhook successfully', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: {} }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = await paymentService.validateWebhook('payload', 'signature');

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'whsec_test_secret'
      );

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should return null for invalid webhook', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await paymentService.validateWebhook('payload', 'invalid_signature');

      expect(result).toBeNull();

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should return null when webhook secret not configured', async () => {
      const result = await paymentService.validateWebhook('payload', 'signature');

      expect(result).toBeNull();
    });
  });

  describe('createConsultationPayment', () => {
    it('should create consultation payment with correct metadata', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 20000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

      const booking = {
        lawyerId: 'lawyer-123',
        userId: 'user-456',
        consultationType: 'initial' as const,
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        duration: 60,
        amount: 200,
        currency: 'usd',
        description: 'Initial consultation'
      };

      const result = await paymentService.createConsultationPayment(booking);

      expect(result.id).toBe('pi_test_123');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 20000,
        currency: 'usd',
        metadata: {
          lawyerId: 'lawyer-123',
          userId: 'user-456',
          consultationType: 'initial',
          scheduledAt: '2024-01-15T10:00:00.000Z',
          duration: '60'
        },
        automatic_payment_methods: {
          enabled: true
        }
      });
    });
  });
});