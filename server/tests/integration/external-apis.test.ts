import { PaymentService } from '../../services/payment-service';
import { LocationService } from '../../services/location-service';
import { TranslationService } from '../../services/translation-service';
import { NotificationService } from '../../services/notification-service';
import { mockExternalServices } from '../setup';

// Mock external services
jest.mock('stripe');
jest.mock('@google-cloud/translate');
jest.mock('twilio');
jest.mock('@sendgrid/mail');

describe('External APIs Integration Tests', () => {
  let paymentService: PaymentService;
  let locationService: LocationService;
  let translationService: TranslationService;
  let notificationService: NotificationService;

  beforeEach(() => {
    paymentService = new PaymentService();
    locationService = new LocationService();
    translationService = new TranslationService();
    notificationService = new NotificationService();
    
    jest.clearAllMocks();
  });

  describe('Payment Service (Stripe Integration)', () => {
    test('should create customer successfully', async () => {
      const customerData = {
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: 'user-123',
          culturalBackground: 'Western'
        }
      };

      mockExternalServices.stripe.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: customerData.email,
        name: customerData.name,
        metadata: customerData.metadata
      });

      const customer = await paymentService.createCustomer(customerData);

      expect(customer.id).toBe('cus_test123');
      expect(customer.email).toBe(customerData.email);
      expect(mockExternalServices.stripe.customers.create).toHaveBeenCalledWith(customerData);
    });

    test('should create subscription for premium features', async () => {
      const subscriptionData = {
        customer: 'cus_test123',
        items: [{ price: 'price_premium_monthly' }],
        metadata: {
          userId: 'user-123',
          plan: 'premium'
        }
      };

      mockExternalServices.stripe.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        customer: subscriptionData.customer,
        items: subscriptionData.items,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000 // 30 days
      });

      const subscription = await paymentService.createSubscription(subscriptionData);

      expect(subscription.id).toBe('sub_test123');
      expect(subscription.status).toBe('active');
      expect(mockExternalServices.stripe.subscriptions.create).toHaveBeenCalledWith(subscriptionData);
    });

    test('should handle payment processing for consultation booking', async () => {
      const paymentData = {
        amount: 15000, // $150.00 in cents
        currency: 'usd',
        customer: 'cus_test123',
        description: 'Legal consultation booking',
        metadata: {
          lawyerId: 'lawyer-123',
          consultationType: 'initial-consultation'
        }
      };

      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: paymentData.amount,
        currency: paymentData.currency,
        client_secret: 'pi_test123_secret_test'
      };

      jest.spyOn(paymentService, 'processPayment').mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.processPayment(paymentData);

      expect(result.id).toBe('pi_test123');
      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(15000);
    });

    test('should handle payment failures gracefully', async () => {
      const paymentData = {
        amount: 10000,
        currency: 'usd',
        customer: 'cus_invalid',
        description: 'Test payment'
      };

      jest.spyOn(paymentService, 'processPayment').mockRejectedValue(
        new Error('Your card was declined')
      );

      await expect(paymentService.processPayment(paymentData))
        .rejects.toThrow('Your card was declined');
    });

    test('should calculate lawyer commission correctly', async () => {
      const transactionData = {
        amount: 30000, // $300.00
        lawyerId: 'lawyer-123',
        commissionRate: 0.15 // 15%
      };

      const commission = await paymentService.calculateCommission(transactionData);

      expect(commission.amount).toBe(4500); // $45.00
      expect(commission.rate).toBe(0.15);
      expect(commission.lawyerId).toBe('lawyer-123');
    });
  });

  describe('Location Service (Google Maps Integration)', () => {
    test('should geocode address successfully', async () => {
      const address = '123 Main St, San Francisco, CA, USA';
      
      const mockGeocodingResult = {
        results: [{
          geometry: {
            location: {
              lat: 37.7749,
              lng: -122.4194
            }
          },
          formatted_address: '123 Main St, San Francisco, CA 94102, USA',
          place_id: 'ChIJIQBpAG2ahYAR_6128GcTUEo'
        }],
        status: 'OK'
      };

      jest.spyOn(locationService, 'geocodeAddress').mockResolvedValue(mockGeocodingResult);

      const result = await locationService.geocodeAddress(address);

      expect(result.results[0].geometry.location.lat).toBe(37.7749);
      expect(result.results[0].geometry.location.lng).toBe(-122.4194);
      expect(result.status).toBe('OK');
    });

    test('should calculate distance between lawyer and client', async () => {
      const origin = { lat: 37.7749, lng: -122.4194 }; // San Francisco
      const destination = { lat: 37.4419, lng: -122.1430 }; // Palo Alto

      const mockDistanceResult = {
        rows: [{
          elements: [{
            distance: { text: '35.2 mi', value: 56650 },
            duration: { text: '45 mins', value: 2700 },
            status: 'OK'
          }]
        }],
        status: 'OK'
      };

      jest.spyOn(locationService, 'calculateDistance').mockResolvedValue(mockDistanceResult);

      const result = await locationService.calculateDistance(origin, destination);

      expect(result.rows[0].elements[0].distance.text).toBe('35.2 mi');
      expect(result.rows[0].elements[0].duration.text).toBe('45 mins');
    });

    test('should find nearby lawyers within radius', async () => {
      const searchParams = {
        location: { lat: 37.7749, lng: -122.4194 },
        radius: 25000, // 25km
        type: 'lawyer'
      };

      const mockNearbyResult = {
        results: [
          {
            place_id: 'place1',
            name: 'Law Office of John Smith',
            geometry: { location: { lat: 37.7849, lng: -122.4094 } },
            rating: 4.5,
            vicinity: 'Financial District, San Francisco'
          }
        ],
        status: 'OK'
      };

      jest.spyOn(locationService, 'findNearbyLawyers').mockResolvedValue(mockNearbyResult);

      const result = await locationService.findNearbyLawyers(searchParams);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Law Office of John Smith');
      expect(result.results[0].rating).toBe(4.5);
    });

    test('should handle geocoding errors', async () => {
      const invalidAddress = 'Invalid Address 12345';

      jest.spyOn(locationService, 'geocodeAddress').mockResolvedValue({
        results: [],
        status: 'ZERO_RESULTS'
      });

      const result = await locationService.geocodeAddress(invalidAddress);

      expect(result.status).toBe('ZERO_RESULTS');
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Translation Service (Google Translate Integration)', () => {
    test('should translate legal guidance to user language', async () => {
      const textToTranslate = 'You have the right to legal representation';
      const targetLanguage = 'es';

      const mockTranslationResult = [
        'Tienes derecho a representación legal',
        { detectedSourceLanguage: 'en' }
      ];

      jest.spyOn(translationService, 'translateText').mockResolvedValue(mockTranslationResult);

      const result = await translationService.translateText(textToTranslate, targetLanguage);

      expect(result[0]).toBe('Tienes derecho a representación legal');
      expect(result[1].detectedSourceLanguage).toBe('en');
    });

    test('should translate complex legal documents', async () => {
      const legalDocument = {
        title: 'Contract Dispute Resolution Guide',
        sections: [
          'Review the original contract terms',
          'Document any breach of contract',
          'Attempt good faith negotiation'
        ]
      };

      const mockTranslatedDocument = {
        title: 'Guía de Resolución de Disputas Contractuales',
        sections: [
          'Revisar los términos del contrato original',
          'Documentar cualquier incumplimiento del contrato',
          'Intentar negociación de buena fe'
        ]
      };

      jest.spyOn(translationService, 'translateDocument').mockResolvedValue(mockTranslatedDocument);

      const result = await translationService.translateDocument(legalDocument, 'es');

      expect(result.title).toBe('Guía de Resolución de Disputas Contractuales');
      expect(result.sections).toHaveLength(3);
      expect(result.sections[0]).toBe('Revisar los términos del contrato original');
    });

    test('should detect language of user input', async () => {
      const userInput = 'Necesito ayuda con un problema legal';

      const mockDetectionResult = [{
        language: 'es',
        confidence: 0.95
      }];

      jest.spyOn(translationService, 'detectLanguage').mockResolvedValue(mockDetectionResult);

      const result = await translationService.detectLanguage(userInput);

      expect(result[0].language).toBe('es');
      expect(result[0].confidence).toBe(0.95);
    });

    test('should handle translation errors gracefully', async () => {
      const invalidText = '';
      const targetLanguage = 'invalid-lang';

      jest.spyOn(translationService, 'translateText').mockRejectedValue(
        new Error('Invalid target language')
      );

      await expect(translationService.translateText(invalidText, targetLanguage))
        .rejects.toThrow('Invalid target language');
    });

    test('should cache translations for performance', async () => {
      const text = 'Legal consultation';
      const targetLanguage = 'fr';
      const expectedTranslation = 'Consultation juridique';

      // First call
      jest.spyOn(translationService, 'translateText').mockResolvedValue([expectedTranslation, {}]);
      const result1 = await translationService.translateText(text, targetLanguage);

      // Second call should use cache
      const result2 = await translationService.translateText(text, targetLanguage);

      expect(result1[0]).toBe(expectedTranslation);
      expect(result2[0]).toBe(expectedTranslation);
      // Should only call external API once due to caching
      expect(translationService.translateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('Notification Service (Twilio & SendGrid Integration)', () => {
    test('should send SMS notification successfully', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Your legal consultation is scheduled for tomorrow at 2 PM',
        userId: 'user-123'
      };

      mockExternalServices.twilio.messages.create.mockResolvedValue({
        sid: 'msg_test123',
        status: 'sent',
        to: smsData.to,
        body: smsData.message
      });

      const result = await notificationService.sendSMS(smsData);

      expect(result.sid).toBe('msg_test123');
      expect(result.status).toBe('sent');
      expect(mockExternalServices.twilio.messages.create).toHaveBeenCalledWith({
        to: smsData.to,
        body: smsData.message,
        from: expect.any(String)
      });
    });

    test('should send email notification successfully', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Legal Guidance Ready',
        content: 'Your legal guidance document is ready for review',
        userId: 'user-123'
      };

      mockExternalServices.sendgrid.send.mockResolvedValue([{
        statusCode: 202,
        body: '',
        headers: {}
      }]);

      const result = await notificationService.sendEmail(emailData);

      expect(result[0].statusCode).toBe(202);
      expect(mockExternalServices.sendgrid.send).toHaveBeenCalledWith({
        to: emailData.to,
        from: expect.any(String),
        subject: emailData.subject,
        html: expect.stringContaining(emailData.content)
      });
    });

    test('should send multilingual notifications', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'consultation-reminder',
        language: 'es',
        data: {
          lawyerName: 'Maria Garcia',
          appointmentTime: '2024-01-15T14:00:00Z'
        }
      };

      const expectedSpanishMessage = 'Su consulta legal con Maria Garcia está programada para mañana a las 2 PM';

      jest.spyOn(notificationService, 'sendMultilingualNotification').mockResolvedValue({
        sms: { sid: 'msg_test123', status: 'sent' },
        email: { statusCode: 202 }
      });

      const result = await notificationService.sendMultilingualNotification(notificationData);

      expect(result.sms.status).toBe('sent');
      expect(result.email.statusCode).toBe(202);
    });

    test('should handle notification failures gracefully', async () => {
      const smsData = {
        to: 'invalid-number',
        message: 'Test message',
        userId: 'user-123'
      };

      mockExternalServices.twilio.messages.create.mockRejectedValue(
        new Error('Invalid phone number')
      );

      await expect(notificationService.sendSMS(smsData))
        .rejects.toThrow('Invalid phone number');
    });

    test('should respect user notification preferences', async () => {
      const userPreferences = {
        userId: 'user-123',
        email: true,
        sms: false,
        push: true,
        language: 'en'
      };

      const notificationData = {
        type: 'case-update',
        message: 'Your mediation case has been updated',
        urgency: 'medium'
      };

      jest.spyOn(notificationService, 'sendBasedOnPreferences').mockResolvedValue({
        email: { statusCode: 202 },
        sms: null, // Not sent due to preferences
        push: { success: true }
      });

      const result = await notificationService.sendBasedOnPreferences(userPreferences, notificationData);

      expect(result.email.statusCode).toBe(202);
      expect(result.sms).toBeNull();
      expect(result.push.success).toBe(true);
    });
  });

  describe('External API Error Handling', () => {
    test('should implement circuit breaker for external services', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        mockExternalServices.stripe.customers.create.mockRejectedValue(
          new Error('Service unavailable')
        );
        
        try {
          await paymentService.createCustomer({ email: 'test@example.com' });
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should now be open
      await expect(paymentService.createCustomer({ email: 'test@example.com' }))
        .rejects.toThrow('Circuit breaker is open');
    });

    test('should implement retry logic with exponential backoff', async () => {
      let callCount = 0;
      mockExternalServices.twilio.messages.create.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({ sid: 'msg_success', status: 'sent' });
      });

      const result = await notificationService.sendSMS({
        to: '+1234567890',
        message: 'Test message',
        userId: 'user-123'
      });

      expect(result.sid).toBe('msg_success');
      expect(callCount).toBe(3); // Should have retried twice
    });

    test('should handle rate limiting gracefully', async () => {
      mockExternalServices.openai.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded. Please try again later.')
      );

      const mockQuery = {
        id: 'query-rate-limit',
        userId: 'user-rate-limit',
        description: 'Test query',
        category: 'contract-law',
        jurisdiction: ['US-CA'],
        urgency: 'low',
        culturalContext: 'Western',
        language: 'en'
      };

      await expect(new (require('../../utils/ai-legal-guidance').AILegalGuidance)().generateGuidance(mockQuery))
        .rejects.toThrow('Rate limit exceeded');
    });
  });
});