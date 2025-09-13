import { Pool } from 'pg';
import { pool } from '../database/config';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CommissionRecord {
  id: string;
  lawyerId: string;
  userId: string;
  referralType: 'consultation' | 'case_referral' | 'mediation';
  commissionRate: number;
  grossAmount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  paymentDate?: Date;
  stripeTransferId?: string;
  createdAt: Date;
}

export interface CommissionSummary {
  lawyerId: string;
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  referralCount: number;
  averageCommissionRate: number;
}

export interface PaymentDistribution {
  lawyerId: string;
  amount: number;
  currency: string;
  stripeAccountId: string;
}

export class CommissionService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // Record a new commission for a lawyer referral
  async recordCommission(
    lawyerId: string,
    userId: string,
    referralType: 'consultation' | 'case_referral' | 'mediation',
    grossAmount: number,
    commissionRate?: number
  ): Promise<CommissionRecord> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get default commission rate if not provided
      if (!commissionRate) {
        commissionRate = await this.getDefaultCommissionRate(referralType);
      }

      const commissionAmount = grossAmount * commissionRate;

      const insertQuery = `
        INSERT INTO commission_tracking 
        (lawyer_id, user_id, referral_type, commission_rate, gross_amount, 
         commission_amount, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `;
      
      const values = [
        lawyerId, userId, referralType, commissionRate, 
        grossAmount, commissionAmount
      ];
      
      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      const record = result.rows[0];
      return {
        id: record.id,
        lawyerId: record.lawyer_id,
        userId: record.user_id,
        referralType: record.referral_type,
        commissionRate: parseFloat(record.commission_rate),
        grossAmount: parseFloat(record.gross_amount),
        commissionAmount: parseFloat(record.commission_amount),
        status: record.status,
        paymentDate: record.payment_date,
        stripeTransferId: record.stripe_transfer_id,
        createdAt: record.created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error recording commission:', error);
      throw new Error('Failed to record commission');
    } finally {
      client.release();
    }
  }

  // Get commission records for a lawyer
  async getLawyerCommissions(
    lawyerId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CommissionRecord[]> {
    try {
      let query = `
        SELECT ct.*, u.email as user_email, l.profile->>'name' as lawyer_name
        FROM commission_tracking ct
        JOIN users u ON ct.user_id = u.id
        JOIN lawyers l ON ct.lawyer_id = l.id
        WHERE ct.lawyer_id = $1
      `;
      
      const params: any[] = [lawyerId];
      
      if (status) {
        query += ` AND ct.status = $${params.length + 1}`;
        params.push(status);
      }
      
      query += ` ORDER BY ct.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => ({
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
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error fetching lawyer commissions:', error);
      throw new Error('Failed to fetch lawyer commissions');
    }
  }

  // Get commission summary for a lawyer
  async getLawyerCommissionSummary(lawyerId: string): Promise<CommissionSummary> {
    try {
      const query = `
        SELECT 
          lawyer_id,
          SUM(commission_amount) as total_earned,
          SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as total_paid,
          COUNT(*) as referral_count,
          AVG(commission_rate) as average_commission_rate
        FROM commission_tracking
        WHERE lawyer_id = $1
        GROUP BY lawyer_id
      `;
      
      const result = await this.db.query(query, [lawyerId]);
      
      if (result.rows.length === 0) {
        return {
          lawyerId,
          totalEarned: 0,
          totalPending: 0,
          totalPaid: 0,
          referralCount: 0,
          averageCommissionRate: 0
        };
      }
      
      const row = result.rows[0];
      return {
        lawyerId: row.lawyer_id,
        totalEarned: parseFloat(row.total_earned) || 0,
        totalPending: parseFloat(row.total_pending) || 0,
        totalPaid: parseFloat(row.total_paid) || 0,
        referralCount: parseInt(row.referral_count) || 0,
        averageCommissionRate: parseFloat(row.average_commission_rate) || 0
      };
    } catch (error) {
      logger.error('Error fetching commission summary:', error);
      throw new Error('Failed to fetch commission summary');
    }
  }

  // Approve pending commissions
  async approveCommissions(commissionIds: string[]): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE commission_tracking 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1) AND status = 'pending'
      `;
      
      await client.query(query, [commissionIds]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error approving commissions:', error);
      throw new Error('Failed to approve commissions');
    } finally {
      client.release();
    }
  }

  // Process commission payments via Stripe
  async processCommissionPayments(lawyerId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get approved commissions for the lawyer
      const commissionsQuery = `
        SELECT * FROM commission_tracking
        WHERE lawyer_id = $1 AND status = 'approved'
        ORDER BY created_at ASC
      `;
      
      const commissionsResult = await client.query(commissionsQuery, [lawyerId]);
      const commissions = commissionsResult.rows;
      
      if (commissions.length === 0) {
        throw new Error('No approved commissions found for payment');
      }

      // Get lawyer's Stripe account ID
      const lawyerQuery = `
        SELECT profile FROM lawyers WHERE id = $1
      `;
      const lawyerResult = await client.query(lawyerQuery, [lawyerId]);
      const lawyerProfile = lawyerResult.rows[0]?.profile;
      
      if (!lawyerProfile?.stripeAccountId) {
        throw new Error('Lawyer does not have a connected Stripe account');
      }

      // Calculate total amount to transfer
      const totalAmount = commissions.reduce((sum, commission) => {
        return sum + parseFloat(commission.commission_amount);
      }, 0);

      // Create Stripe transfer
      const transfer = await stripe.transfers.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        destination: lawyerProfile.stripeAccountId,
        metadata: {
          lawyerId,
          commissionIds: commissions.map(c => c.id).join(',')
        }
      });

      // Update commission records
      const updateQuery = `
        UPDATE commission_tracking 
        SET status = 'paid', 
            payment_date = CURRENT_TIMESTAMP,
            stripe_transfer_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2)
      `;
      
      const commissionIds = commissions.map(c => c.id);
      await client.query(updateQuery, [transfer.id, commissionIds]);

      // Record billing transaction
      const transactionQuery = `
        INSERT INTO billing_transactions 
        (user_id, amount, currency, transaction_type, status, description, metadata)
        VALUES ($1, $2, 'USD', 'commission', 'completed', $3, $4)
      `;
      
      const description = `Commission payment to lawyer ${lawyerId}`;
      const metadata = {
        lawyerId,
        stripeTransferId: transfer.id,
        commissionCount: commissions.length
      };
      
      // Use the first commission's user_id for the transaction record
      await client.query(transactionQuery, [
        commissions[0].user_id,
        -totalAmount, // Negative amount for outgoing payment
        description,
        JSON.stringify(metadata)
      ]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error processing commission payments:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get commission analytics for admin dashboard
  async getCommissionAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCommissions: number;
    totalAmount: number;
    averageCommissionRate: number;
    topLawyers: Array<{ lawyerId: string; name: string; totalEarned: number }>;
    commissionsByType: Record<string, { count: number; amount: number }>;
  }> {
    try {
      let dateFilter = '';
      const params: any[] = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE ct.created_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Get overall statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_commissions,
          SUM(commission_amount) as total_amount,
          AVG(commission_rate) as average_commission_rate
        FROM commission_tracking ct
        ${dateFilter}
      `;
      
      const statsResult = await this.db.query(statsQuery, params);
      const stats = statsResult.rows[0];

      // Get top lawyers by earnings
      const topLawyersQuery = `
        SELECT 
          ct.lawyer_id,
          l.profile->>'name' as name,
          SUM(ct.commission_amount) as total_earned
        FROM commission_tracking ct
        JOIN lawyers l ON ct.lawyer_id = l.id
        ${dateFilter}
        GROUP BY ct.lawyer_id, l.profile->>'name'
        ORDER BY total_earned DESC
        LIMIT 10
      `;
      
      const topLawyersResult = await this.db.query(topLawyersQuery, params);

      // Get commissions by type
      const typeQuery = `
        SELECT 
          referral_type,
          COUNT(*) as count,
          SUM(commission_amount) as amount
        FROM commission_tracking ct
        ${dateFilter}
        GROUP BY referral_type
      `;
      
      const typeResult = await this.db.query(typeQuery, params);
      
      const commissionsByType: Record<string, { count: number; amount: number }> = {};
      typeResult.rows.forEach(row => {
        commissionsByType[row.referral_type] = {
          count: parseInt(row.count),
          amount: parseFloat(row.amount)
        };
      });

      return {
        totalCommissions: parseInt(stats.total_commissions) || 0,
        totalAmount: parseFloat(stats.total_amount) || 0,
        averageCommissionRate: parseFloat(stats.average_commission_rate) || 0,
        topLawyers: topLawyersResult.rows.map(row => ({
          lawyerId: row.lawyer_id,
          name: row.name,
          totalEarned: parseFloat(row.total_earned)
        })),
        commissionsByType
      };
    } catch (error) {
      logger.error('Error fetching commission analytics:', error);
      throw new Error('Failed to fetch commission analytics');
    }
  }

  // Get default commission rate based on referral type
  private async getDefaultCommissionRate(referralType: string): Promise<number> {
    const defaultRates = {
      consultation: 0.15, // 15%
      case_referral: 0.20, // 20%
      mediation: 0.10 // 10%
    };
    
    return defaultRates[referralType as keyof typeof defaultRates] || 0.15;
  }

  // Dispute a commission
  async disputeCommission(commissionId: string, reason: string): Promise<void> {
    try {
      const query = `
        UPDATE commission_tracking 
        SET status = 'disputed', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await this.db.query(query, [commissionId]);
      
      // Log the dispute reason (in a real system, you might want a separate disputes table)
      logger.info(`Commission ${commissionId} disputed: ${reason}`);
    } catch (error) {
      logger.error('Error disputing commission:', error);
      throw new Error('Failed to dispute commission');
    }
  }

  // Get pending commissions for admin approval
  async getPendingCommissions(
    limit: number = 50,
    offset: number = 0
  ): Promise<CommissionRecord[]> {
    try {
      const query = `
        SELECT ct.*, 
               u.email as user_email, 
               l.profile->>'name' as lawyer_name,
               l.profile->>'email' as lawyer_email
        FROM commission_tracking ct
        JOIN users u ON ct.user_id = u.id
        JOIN lawyers l ON ct.lawyer_id = l.id
        WHERE ct.status = 'pending'
        ORDER BY ct.created_at ASC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await this.db.query(query, [limit, offset]);
      
      return result.rows.map(row => ({
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
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error fetching pending commissions:', error);
      throw new Error('Failed to fetch pending commissions');
    }
  }
}

export const commissionService = new CommissionService();