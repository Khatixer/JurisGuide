import { Pool } from 'pg';
import { pool } from '../database/config';
import { logger } from '../utils/logger';

export interface WhiteLabelConfig {
  id: string;
  organizationName: string;
  subdomain: string;
  customDomain?: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    favicon?: string;
    companyName?: string;
    tagline?: string;
  };
  features: {
    legalGuidance?: boolean;
    lawyerMatching?: boolean;
    mediation?: boolean;
    whiteLabel?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    analytics?: boolean;
  };
  billingConfig: {
    commissionRates?: {
      consultation?: number;
      caseReferral?: number;
      mediation?: number;
    };
    paymentGateway?: {
      stripeAccountId?: string;
      paypalClientId?: string;
    };
    subscriptionPlans?: string[];
  };
  adminUserId: string;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantContext {
  tenantId: string;
  subdomain: string;
  customDomain?: string;
  branding: WhiteLabelConfig['branding'];
  features: WhiteLabelConfig['features'];
  billingConfig: WhiteLabelConfig['billingConfig'];
}

export class WhiteLabelService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // Create a new white-label configuration
  async createWhiteLabelConfig(
    organizationName: string,
    subdomain: string,
    adminUserId: string,
    branding: WhiteLabelConfig['branding'] = {},
    features: WhiteLabelConfig['features'] = {},
    billingConfig: WhiteLabelConfig['billingConfig'] = {}
  ): Promise<WhiteLabelConfig> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if subdomain is already taken
      const existingQuery = `
        SELECT id FROM white_label_configs WHERE subdomain = $1
      `;
      const existingResult = await client.query(existingQuery, [subdomain]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('Subdomain is already taken');
      }

      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        throw new Error('Subdomain must contain only lowercase letters, numbers, and hyphens');
      }

      // Set default features
      const defaultFeatures = {
        legalGuidance: true,
        lawyerMatching: true,
        mediation: false,
        whiteLabel: true,
        customBranding: true,
        apiAccess: false,
        analytics: false,
        ...features
      };

      // Set default branding
      const defaultBranding = {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'Inter, sans-serif',
        companyName: organizationName,
        ...branding
      };

      // Set default billing config
      const defaultBillingConfig = {
        commissionRates: {
          consultation: 0.15,
          caseReferral: 0.20,
          mediation: 0.10
        },
        ...billingConfig
      };

      const insertQuery = `
        INSERT INTO white_label_configs 
        (organization_name, subdomain, branding, features, billing_config, admin_user_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;
      
      const values = [
        organizationName,
        subdomain,
        JSON.stringify(defaultBranding),
        JSON.stringify(defaultFeatures),
        JSON.stringify(defaultBillingConfig),
        adminUserId
      ];
      
      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      const config = result.rows[0];
      return this.mapRowToConfig(config);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating white-label config:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get white-label configuration by subdomain
  async getConfigBySubdomain(subdomain: string): Promise<WhiteLabelConfig | null> {
    try {
      const query = `
        SELECT * FROM white_label_configs 
        WHERE subdomain = $1 AND status = 'active'
      `;
      
      const result = await this.db.query(query, [subdomain]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching config by subdomain:', error);
      throw new Error('Failed to fetch white-label configuration');
    }
  }

  // Get white-label configuration by custom domain
  async getConfigByDomain(domain: string): Promise<WhiteLabelConfig | null> {
    try {
      const query = `
        SELECT * FROM white_label_configs 
        WHERE custom_domain = $1 AND status = 'active'
      `;
      
      const result = await this.db.query(query, [domain]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching config by domain:', error);
      throw new Error('Failed to fetch white-label configuration');
    }
  }

  // Get white-label configuration by ID
  async getConfigById(id: string): Promise<WhiteLabelConfig | null> {
    try {
      const query = `
        SELECT * FROM white_label_configs WHERE id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching config by ID:', error);
      throw new Error('Failed to fetch white-label configuration');
    }
  }

  // Update white-label configuration
  async updateWhiteLabelConfig(
    id: string,
    updates: Partial<Pick<WhiteLabelConfig, 'organizationName' | 'customDomain' | 'branding' | 'features' | 'billingConfig' | 'status'>>
  ): Promise<WhiteLabelConfig> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.organizationName !== undefined) {
        updateFields.push(`organization_name = $${paramCount++}`);
        values.push(updates.organizationName);
      }

      if (updates.customDomain !== undefined) {
        updateFields.push(`custom_domain = $${paramCount++}`);
        values.push(updates.customDomain);
      }

      if (updates.branding !== undefined) {
        updateFields.push(`branding = $${paramCount++}`);
        values.push(JSON.stringify(updates.branding));
      }

      if (updates.features !== undefined) {
        updateFields.push(`features = $${paramCount++}`);
        values.push(JSON.stringify(updates.features));
      }

      if (updates.billingConfig !== undefined) {
        updateFields.push(`billing_config = $${paramCount++}`);
        values.push(JSON.stringify(updates.billingConfig));
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE white_label_configs 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('White-label configuration not found');
      }
      
      await client.query('COMMIT');
      
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating white-label config:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // List all white-label configurations (admin only)
  async listConfigs(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WhiteLabelConfig[]> {
    try {
      let query = `
        SELECT wlc.*, u.email as admin_email
        FROM white_label_configs wlc
        JOIN users u ON wlc.admin_user_id = u.id
      `;
      
      const params: any[] = [];
      
      if (status) {
        query += ` WHERE wlc.status = $1`;
        params.push(status);
      }
      
      query += ` ORDER BY wlc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => this.mapRowToConfig(row));
    } catch (error) {
      logger.error('Error listing white-label configs:', error);
      throw new Error('Failed to list white-label configurations');
    }
  }

  // Get tenant context for middleware
  async getTenantContext(identifier: string, type: 'subdomain' | 'domain'): Promise<TenantContext | null> {
    try {
      let config: WhiteLabelConfig | null;
      
      if (type === 'subdomain') {
        config = await this.getConfigBySubdomain(identifier);
      } else {
        config = await this.getConfigByDomain(identifier);
      }
      
      if (!config) {
        return null;
      }
      
      return {
        tenantId: config.id,
        subdomain: config.subdomain,
        customDomain: config.customDomain,
        branding: config.branding,
        features: config.features,
        billingConfig: config.billingConfig
      };
    } catch (error) {
      logger.error('Error getting tenant context:', error);
      return null;
    }
  }

  // Delete white-label configuration
  async deleteConfig(id: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if config exists
      const checkQuery = `SELECT id FROM white_label_configs WHERE id = $1`;
      const checkResult = await client.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('White-label configuration not found');
      }

      // Soft delete by setting status to cancelled
      const updateQuery = `
        UPDATE white_label_configs 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [id]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting white-label config:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if subdomain is available
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    try {
      const query = `
        SELECT id FROM white_label_configs 
        WHERE subdomain = $1 AND status != 'cancelled'
      `;
      
      const result = await this.db.query(query, [subdomain]);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking subdomain availability:', error);
      return false;
    }
  }

  // Get analytics for a white-label tenant
  async getTenantAnalytics(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    subscriptions: number;
    legalQueries: number;
    lawyerMatches: number;
    mediationCases: number;
  }> {
    try {
      // This would need to be implemented based on how tenant data is tracked
      // For now, returning a placeholder structure
      const query = `
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN lq.created_at BETWEEN $2 AND $3 THEN u.id END) as active_users,
          COUNT(lq.id) as legal_queries,
          COUNT(us.id) as subscriptions
        FROM users u
        LEFT JOIN legal_queries lq ON u.id = lq.user_id
        LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
        WHERE u.profile->>'tenantId' = $1
      `;
      
      const result = await this.db.query(query, [tenantId, startDate, endDate]);
      const row = result.rows[0];
      
      return {
        totalUsers: parseInt(row.total_users) || 0,
        activeUsers: parseInt(row.active_users) || 0,
        totalRevenue: 0, // Would need to calculate from billing_transactions
        subscriptions: parseInt(row.subscriptions) || 0,
        legalQueries: parseInt(row.legal_queries) || 0,
        lawyerMatches: 0, // Would need to track lawyer matches
        mediationCases: 0 // Would need to track mediation cases
      };
    } catch (error) {
      logger.error('Error getting tenant analytics:', error);
      throw new Error('Failed to get tenant analytics');
    }
  }

  private mapRowToConfig(row: any): WhiteLabelConfig {
    return {
      id: row.id,
      organizationName: row.organization_name,
      subdomain: row.subdomain,
      customDomain: row.custom_domain,
      branding: row.branding || {},
      features: row.features || {},
      billingConfig: row.billing_config || {},
      adminUserId: row.admin_user_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const whiteLabelService = new WhiteLabelService();