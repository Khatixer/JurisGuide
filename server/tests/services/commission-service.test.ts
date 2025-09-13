import { CommissionService } from '../../services/commission-service';
import { pool } from '../../database/config';
import { jest } from '@jest/globals';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    transfers: {
      create: jest.fn().mockResolvedValue({ id: 'tr_test123' })
    }
  }));
});

describe('CommissionService', () => {
  let commissionService: CommissionService;
  let testUserId: string;
  let testLawyerId: string;

  beforeAll(async () => {
    commissionService = new CommissionService();
    
    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, profile, preferences)
      VALUES ('testuser@example.com', 'hashedpassword', '{}', '{}')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;
    
    // Create test lawyer
    const lawyerResult = await pool.query(`
      INSERT INTO lawyers (profile, specializations, location, availability, pricing, verification_status)
      VALUES (
        '{"name": "Test Lawyer", "email": "lawyer@example.com", "stripeAccountId": "acct_test123"}',
        '{"corporate", "litigation"}',
        '{"city": "New York", "state": "NY"}',
        '{"monday": "9-17", "tuesday": "9-17"}',
        '{"hourly": 300, "consultation": 150}',
        'verified'
      )
      RETURNING id
    `);
    testLawyerId = lawyerResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM commission_tracking WHERE lawyer_id = $1', [testLawyerId]);
    await pool.query('DELETE FROM lawyers WHERE id = $1', [testLawyerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up any existing commissions for test lawyer
    await pool.query('DELETE FROM commission_tracking WHERE lawyer_id = $1', [testLawyerId]);
  });

  describe('recordCommission', () => {
    it('should record a new commission successfully', async () => {
      const commission = await commissionService.recordCommission(
        testLawyerId,
        testUserId,
        'consultation',
        1000,
        0.15
      );
      
      expect(commission).toBeDefined();
      expect(commission.lawyerId).toBe(testLawyerId);
      expect(commission.userId).toBe(testUserId);
      expect(commission.referralType).toBe('consultation');
      expect(commission.grossAmount).toBe(1000);
      expect(commission.commissionRate).toBe(0.15);
      expect(commission.commissionAmount).toBe(150);
      expect(commission.status).toBe('pending');
    });

    it('should use default commission rate when not provided', async () => {
      const commission = await commissionService.recordCommission(
        testLawyerId,
        testUserId,
        'consultation',
        1000
      );
      
      expect(commission.commissionRate).toBe(0.15); // Default for consultation
      expect(commission.commissionAmount).toBe(150);
    });

    it('should calculate commission amount correctly', async () => {
      const commission = await commissionService.recordCommission(
        testLawyerId,
        testUserId,
        'case_referral',
        2500,
        0.20
      );
      
      expect(commission.commissionAmount).toBe(500); // 2500 * 0.20
    });
  });

  describe('getLawyerCommissions', () => {
    beforeEach(async () => {
      // Create test commissions
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      await commissionService.recordCommission(testLawyerId, testUserId, 'case_referral', 2000, 0.20);
    });

    it('should return all commissions for a lawyer', async () => {
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      
      expect(commissions).toBeDefined();
      expect(commissions.length).toBe(2);
      expect(commissions[0].lawyerId).toBe(testLawyerId);
      expect(commissions[1].lawyerId).toBe(testLawyerId);
    });

    it('should filter commissions by status', async () => {
      const commissions = await commissionService.getLawyerCommissions(testLawyerId, 'pending');
      
      expect(commissions.length).toBe(2);
      commissions.forEach(commission => {
        expect(commission.status).toBe('pending');
      });
    });

    it('should respect limit and offset parameters', async () => {
      const commissions = await commissionService.getLawyerCommissions(testLawyerId, undefined, 1, 0);
      
      expect(commissions.length).toBe(1);
    });
  });

  describe('getLawyerCommissionSummary', () => {
    beforeEach(async () => {
      // Create test commissions with different statuses
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      await commissionService.recordCommission(testLawyerId, testUserId, 'case_referral', 2000, 0.20);
      
      // Approve one commission
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      await commissionService.approveCommissions([commissions[0].id]);
    });

    it('should return correct commission summary', async () => {
      const summary = await commissionService.getLawyerCommissionSummary(testLawyerId);
      
      expect(summary).toBeDefined();
      expect(summary.lawyerId).toBe(testLawyerId);
      expect(summary.totalEarned).toBe(550); // 150 + 400
      expect(summary.referralCount).toBe(2);
      expect(summary.averageCommissionRate).toBeCloseTo(0.175); // (0.15 + 0.20) / 2
    });

    it('should return zero values for lawyer with no commissions', async () => {
      // Create a new lawyer with no commissions
      const newLawyerResult = await pool.query(`
        INSERT INTO lawyers (profile, specializations, location, availability, pricing, verification_status)
        VALUES ('{"name": "New Lawyer"}', '{"corporate"}', '{}', '{}', '{}', 'verified')
        RETURNING id
      `);
      const newLawyerId = newLawyerResult.rows[0].id;
      
      const summary = await commissionService.getLawyerCommissionSummary(newLawyerId);
      
      expect(summary.totalEarned).toBe(0);
      expect(summary.totalPending).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.referralCount).toBe(0);
      expect(summary.averageCommissionRate).toBe(0);
      
      // Clean up
      await pool.query('DELETE FROM lawyers WHERE id = $1', [newLawyerId]);
    });
  });

  describe('approveCommissions', () => {
    it('should approve pending commissions', async () => {
      // Create test commissions
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      await commissionService.recordCommission(testLawyerId, testUserId, 'case_referral', 2000, 0.20);
      
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      const commissionIds = commissions.map(c => c.id);
      
      await commissionService.approveCommissions(commissionIds);
      
      // Verify commissions are approved
      const approvedCommissions = await commissionService.getLawyerCommissions(testLawyerId, 'approved');
      expect(approvedCommissions.length).toBe(2);
    });

    it('should only approve pending commissions', async () => {
      // Create and approve a commission
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      await commissionService.approveCommissions([commissions[0].id]);
      
      // Try to approve again (should not change anything)
      await commissionService.approveCommissions([commissions[0].id]);
      
      const approvedCommissions = await commissionService.getLawyerCommissions(testLawyerId, 'approved');
      expect(approvedCommissions.length).toBe(1);
    });
  });

  describe('processCommissionPayments', () => {
    it('should process payments for approved commissions', async () => {
      // Create and approve commissions
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      await commissionService.approveCommissions([commissions[0].id]);
      
      await commissionService.processCommissionPayments(testLawyerId);
      
      // Verify commission is marked as paid
      const paidCommissions = await commissionService.getLawyerCommissions(testLawyerId, 'paid');
      expect(paidCommissions.length).toBe(1);
      expect(paidCommissions[0].stripeTransferId).toBe('tr_test123');
      expect(paidCommissions[0].paymentDate).toBeDefined();
    });

    it('should throw error when no approved commissions exist', async () => {
      await expect(
        commissionService.processCommissionPayments(testLawyerId)
      ).rejects.toThrow('No approved commissions found for payment');
    });

    it('should throw error when lawyer has no Stripe account', async () => {
      // Create lawyer without Stripe account
      const noStripeResult = await pool.query(`
        INSERT INTO lawyers (profile, specializations, location, availability, pricing, verification_status)
        VALUES ('{"name": "No Stripe Lawyer"}', '{"corporate"}', '{}', '{}', '{}', 'verified')
        RETURNING id
      `);
      const noStripeLawyerId = noStripeResult.rows[0].id;
      
      // Create and approve commission
      await commissionService.recordCommission(noStripeLawyerId, testUserId, 'consultation', 1000, 0.15);
      const commissions = await commissionService.getLawyerCommissions(noStripeLawyerId);
      await commissionService.approveCommissions([commissions[0].id]);
      
      await expect(
        commissionService.processCommissionPayments(noStripeLawyerId)
      ).rejects.toThrow('Lawyer does not have a connected Stripe account');
      
      // Clean up
      await pool.query('DELETE FROM commission_tracking WHERE lawyer_id = $1', [noStripeLawyerId]);
      await pool.query('DELETE FROM lawyers WHERE id = $1', [noStripeLawyerId]);
    });
  });

  describe('disputeCommission', () => {
    it('should mark commission as disputed', async () => {
      // Create commission
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      const commissions = await commissionService.getLawyerCommissions(testLawyerId);
      
      await commissionService.disputeCommission(commissions[0].id, 'Client did not pay');
      
      // Verify commission is disputed
      const disputedCommissions = await commissionService.getLawyerCommissions(testLawyerId, 'disputed');
      expect(disputedCommissions.length).toBe(1);
    });
  });

  describe('getPendingCommissions', () => {
    beforeEach(async () => {
      // Create multiple pending commissions
      await commissionService.recordCommission(testLawyerId, testUserId, 'consultation', 1000, 0.15);
      await commissionService.recordCommission(testLawyerId, testUserId, 'case_referral', 2000, 0.20);
    });

    it('should return pending commissions', async () => {
      const pendingCommissions = await commissionService.getPendingCommissions();
      
      expect(pendingCommissions.length).toBeGreaterThanOrEqual(2);
      pendingCommissions.forEach(commission => {
        expect(commission.status).toBe('pending');
      });
    });

    it('should respect limit parameter', async () => {
      const pendingCommissions = await commissionService.getPendingCommissions(1);
      
      expect(pendingCommissions.length).toBe(1);
    });
  });
});