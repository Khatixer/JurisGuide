import express from 'express';
import { commissionService } from '../services/commission-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Record a new commission (internal use - called when referral happens)
router.post('/record', authenticateToken, async (req, res) => {
  try {
    const { lawyerId, userId, referralType, grossAmount, commissionRate } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      lawyerId: { required: true, type: 'string' },
      userId: { required: true, type: 'string' },
      referralType: { required: true, type: 'string', enum: ['consultation', 'case_referral', 'mediation'] },
      grossAmount: { required: true, type: 'number', min: 0 },
      commissionRate: { required: false, type: 'number', min: 0, max: 1 }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    const commission = await commissionService.recordCommission(
      lawyerId,
      userId,
      referralType,
      grossAmount,
      commissionRate
    );
    
    res.status(201).json(successResponse(commission, 'Commission recorded successfully'));
  } catch (error) {
    logger.error('Error recording commission:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to record commission'));
    }
  }
});

// Get commissions for a specific lawyer
router.get('/lawyer/:lawyerId', authenticateToken, async (req, res) => {
  try {
    const { lawyerId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;
    
    const commissions = await commissionService.getLawyerCommissions(
      lawyerId,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(successResponse(commissions, 'Lawyer commissions retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching lawyer commissions:', error);
    res.status(500).json(errorResponse('Failed to fetch lawyer commissions'));
  }
});

// Get commission summary for a lawyer
router.get('/lawyer/:lawyerId/summary', authenticateToken, async (req, res) => {
  try {
    const { lawyerId } = req.params;
    
    const summary = await commissionService.getLawyerCommissionSummary(lawyerId);
    
    res.json(successResponse(summary, 'Commission summary retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching commission summary:', error);
    res.status(500).json(errorResponse('Failed to fetch commission summary'));
  }
});

// Approve pending commissions (admin only)
router.post('/approve', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { commissionIds } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      commissionIds: { required: true, type: 'array' }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json(errorResponse('Commission IDs must be a non-empty array'));
    }

    await commissionService.approveCommissions(commissionIds);
    
    res.json(successResponse(null, 'Commissions approved successfully'));
  } catch (error) {
    logger.error('Error approving commissions:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to approve commissions'));
    }
  }
});

// Process commission payments for a lawyer
router.post('/pay/:lawyerId', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { lawyerId } = req.params;
    
    await commissionService.processCommissionPayments(lawyerId);
    
    res.json(successResponse(null, 'Commission payments processed successfully'));
  } catch (error) {
    logger.error('Error processing commission payments:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to process commission payments'));
    }
  }
});

// Get commission analytics (admin only)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { startDate, endDate } = req.query;
    
    let start: Date | undefined;
    let end: Date | undefined;
    
    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        return res.status(400).json(errorResponse('Invalid start date format'));
      }
    }
    
    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        return res.status(400).json(errorResponse('Invalid end date format'));
      }
    }
    
    const analytics = await commissionService.getCommissionAnalytics(start, end);
    
    res.json(successResponse(analytics, 'Commission analytics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching commission analytics:', error);
    res.status(500).json(errorResponse('Failed to fetch commission analytics'));
  }
});

// Dispute a commission
router.post('/dispute/:commissionId', authenticateToken, async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { reason } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      reason: { required: true, type: 'string', minLength: 10 }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    await commissionService.disputeCommission(commissionId, reason);
    
    res.json(successResponse(null, 'Commission disputed successfully'));
  } catch (error) {
    logger.error('Error disputing commission:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to dispute commission'));
    }
  }
});

// Get pending commissions for admin review
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { limit = '50', offset = '0' } = req.query;
    
    const commissions = await commissionService.getPendingCommissions(
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(successResponse(commissions, 'Pending commissions retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching pending commissions:', error);
    res.status(500).json(errorResponse('Failed to fetch pending commissions'));
  }
});

// Get commission details by ID
router.get('/:commissionId', authenticateToken, async (req, res) => {
  try {
    const { commissionId } = req.params;
    
    // Get commission details (this would need to be implemented in the service)
    const query = `
      SELECT ct.*, 
             u.email as user_email, 
             l.profile->>'name' as lawyer_name,
             l.profile->>'email' as lawyer_email
      FROM commission_tracking ct
      JOIN users u ON ct.user_id = u.id
      JOIN lawyers l ON ct.lawyer_id = l.id
      WHERE ct.id = $1
    `;
    
    const result = await commissionService['db'].query(query, [commissionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Commission not found'));
    }
    
    const row = result.rows[0];
    const commission = {
      id: row.id,
      lawyerId: row.lawyer_id,
      userId: row.user_id,
      referralType: row.referral_type,
      commissionRate: parseFloat(row.commission_rate),
      grossAmount: parseFloat(row.gross_amount),
      commissionAmount: parseFloat(row.commission_amount),
      status: row.status,
      paymentDate: row.payment_date,
      stripeTransferId: row.stripe_transfer_id,
      createdAt: row.created_at,
      userEmail: row.user_email,
      lawyerName: row.lawyer_name,
      lawyerEmail: row.lawyer_email
    };
    
    res.json(successResponse(commission, 'Commission details retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching commission details:', error);
    res.status(500).json(errorResponse('Failed to fetch commission details'));
  }
});

export default router;