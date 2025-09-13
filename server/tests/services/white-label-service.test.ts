import { WhiteLabelService } from '../../services/white-label-service';
import { pool } from '../../database/config';

describe('WhiteLabelService', () => {
  let whiteLabelService: WhiteLabelService;
  let testAdminUserId: string;
  let testConfigId: string;

  beforeAll(async () => {
    whiteLabelService = new WhiteLabelService();
    
    // Create test admin user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, profile, preferences)
      VALUES ('admin@example.com', 'hashedpassword', '{}', '{}')
      RETURNING id
    `);
    testAdminUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testConfigId) {
      await pool.query('DELETE FROM white_label_configs WHERE id = $1', [testConfigId]);
    }
    await pool.query('DELETE FROM users WHERE id = $1', [testAdminUserId]);
  });

  beforeEach(async () => {
    // Clean up any existing test configs
    await pool.query('DELETE FROM white_label_configs WHERE subdomain LIKE $1', ['test-%']);
  });

  describe('createWhiteLabelConfig', () => {
    it('should create a new white-label configuration successfully', async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-org',
        testAdminUserId,
        { primaryColor: '#ff0000' },
        { legalGuidance: true },
        { commissionRates: { consultation: 0.20 } }
      );
      
      testConfigId = config.id;
      
      expect(config).toBeDefined();
      expect(config.organizationName).toBe('Test Organization');
      expect(config.subdomain).toBe('test-org');
      expect(config.adminUserId).toBe(testAdminUserId);
      expect(config.status).toBe('active');
      expect(config.branding.primaryColor).toBe('#ff0000');
      expect(config.features.legalGuidance).toBe(true);
      expect(config.billingConfig.commissionRates?.consultation).toBe(0.20);
    });

    it('should throw error when subdomain is already taken', async () => {
      // Create first config
      const config1 = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization 1',
        'test-duplicate',
        testAdminUserId
      );
      
      // Try to create second config with same subdomain
      await expect(
        whiteLabelService.createWhiteLabelConfig(
          'Test Organization 2',
          'test-duplicate',
          testAdminUserId
        )
      ).rejects.toThrow('Subdomain is already taken');
      
      // Clean up
      await pool.query('DELETE FROM white_label_configs WHERE id = $1', [config1.id]);
    });

    it('should throw error for invalid subdomain format', async () => {
      await expect(
        whiteLabelService.createWhiteLabelConfig(
          'Test Organization',
          'Test_Invalid!',
          testAdminUserId
        )
      ).rejects.toThrow('Subdomain must contain only lowercase letters, numbers, and hyphens');
    });

    it('should set default values when not provided', async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-defaults',
        testAdminUserId
      );
      
      expect(config.branding.primaryColor).toBe('#2563eb');
      expect(config.branding.companyName).toBe('Test Organization');
      expect(config.features.legalGuidance).toBe(true);
      expect(config.features.lawyerMatching).toBe(true);
      expect(config.billingConfig.commissionRates?.consultation).toBe(0.15);
      
      // Clean up
      await pool.query('DELETE FROM white_label_configs WHERE id = $1', [config.id]);
    });
  });

  describe('getConfigBySubdomain', () => {
    beforeEach(async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-subdomain',
        testAdminUserId
      );
      testConfigId = config.id;
    });

    it('should return config when subdomain exists', async () => {
      const config = await whiteLabelService.getConfigBySubdomain('test-subdomain');
      
      expect(config).toBeDefined();
      expect(config?.subdomain).toBe('test-subdomain');
      expect(config?.organizationName).toBe('Test Organization');
    });

    it('should return null when subdomain does not exist', async () => {
      const config = await whiteLabelService.getConfigBySubdomain('non-existent');
      expect(config).toBeNull();
    });

    it('should return null for inactive configs', async () => {
      // Update config to suspended status
      await whiteLabelService.updateWhiteLabelConfig(testConfigId, { status: 'suspended' });
      
      const config = await whiteLabelService.getConfigBySubdomain('test-subdomain');
      expect(config).toBeNull();
    });
  });

  describe('getConfigByDomain', () => {
    beforeEach(async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-domain',
        testAdminUserId
      );
      testConfigId = config.id;
      
      // Set custom domain
      await whiteLabelService.updateWhiteLabelConfig(testConfigId, {
        customDomain: 'custom.example.com'
      });
    });

    it('should return config when custom domain exists', async () => {
      const config = await whiteLabelService.getConfigByDomain('custom.example.com');
      
      expect(config).toBeDefined();
      expect(config?.customDomain).toBe('custom.example.com');
      expect(config?.organizationName).toBe('Test Organization');
    });

    it('should return null when domain does not exist', async () => {
      const config = await whiteLabelService.getConfigByDomain('non-existent.com');
      expect(config).toBeNull();
    });
  });

  describe('updateWhiteLabelConfig', () => {
    beforeEach(async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-update',
        testAdminUserId
      );
      testConfigId = config.id;
    });

    it('should update organization name', async () => {
      const updatedConfig = await whiteLabelService.updateWhiteLabelConfig(testConfigId, {
        organizationName: 'Updated Organization'
      });
      
      expect(updatedConfig.organizationName).toBe('Updated Organization');
    });

    it('should update branding', async () => {
      const newBranding = {
        primaryColor: '#00ff00',
        secondaryColor: '#0000ff',
        companyName: 'New Company'
      };
      
      const updatedConfig = await whiteLabelService.updateWhiteLabelConfig(testConfigId, {
        branding: newBranding
      });
      
      expect(updatedConfig.branding.primaryColor).toBe('#00ff00');
      expect(updatedConfig.branding.secondaryColor).toBe('#0000ff');
      expect(updatedConfig.branding.companyName).toBe('New Company');
    });

    it('should update features', async () => {
      const newFeatures = {
        legalGuidance: false,
        lawyerMatching: true,
        mediation: true
      };
      
      const updatedConfig = await whiteLabelService.updateWhiteLabelConfig(testConfigId, {
        features: newFeatures
      });
      
      expect(updatedConfig.features.legalGuidance).toBe(false);
      expect(updatedConfig.features.mediation).toBe(true);
    });

    it('should update status', async () => {
      const updatedConfig = await whiteLabelService.updateWhiteLabelConfig(testConfigId, {
        status: 'suspended'
      });
      
      expect(updatedConfig.status).toBe('suspended');
    });

    it('should throw error when config does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        whiteLabelService.updateWhiteLabelConfig(nonExistentId, {
          organizationName: 'Updated'
        })
      ).rejects.toThrow('White-label configuration not found');
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        whiteLabelService.updateWhiteLabelConfig(testConfigId, {})
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('listConfigs', () => {
    beforeEach(async () => {
      // Create multiple test configs
      const config1 = await whiteLabelService.createWhiteLabelConfig(
        'Test Org 1',
        'test-list-1',
        testAdminUserId
      );
      
      const config2 = await whiteLabelService.createWhiteLabelConfig(
        'Test Org 2',
        'test-list-2',
        testAdminUserId
      );
      
      // Suspend one config
      await whiteLabelService.updateWhiteLabelConfig(config2.id, { status: 'suspended' });
      
      // Store IDs for cleanup
      testConfigId = config1.id;
      
      // Clean up second config after test
      setTimeout(async () => {
        await pool.query('DELETE FROM white_label_configs WHERE id = $1', [config2.id]);
      }, 100);
    });

    it('should return all configs when no status filter', async () => {
      const configs = await whiteLabelService.listConfigs();
      
      expect(configs.length).toBeGreaterThanOrEqual(2);
      expect(configs.some(c => c.subdomain === 'test-list-1')).toBe(true);
      expect(configs.some(c => c.subdomain === 'test-list-2')).toBe(true);
    });

    it('should filter configs by status', async () => {
      const activeConfigs = await whiteLabelService.listConfigs('active');
      const suspendedConfigs = await whiteLabelService.listConfigs('suspended');
      
      expect(activeConfigs.some(c => c.subdomain === 'test-list-1')).toBe(true);
      expect(activeConfigs.every(c => c.status === 'active')).toBe(true);
      
      expect(suspendedConfigs.some(c => c.subdomain === 'test-list-2')).toBe(true);
      expect(suspendedConfigs.every(c => c.status === 'suspended')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const configs = await whiteLabelService.listConfigs(undefined, 1);
      expect(configs.length).toBe(1);
    });
  });

  describe('isSubdomainAvailable', () => {
    beforeEach(async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-availability',
        testAdminUserId
      );
      testConfigId = config.id;
    });

    it('should return false for taken subdomain', async () => {
      const isAvailable = await whiteLabelService.isSubdomainAvailable('test-availability');
      expect(isAvailable).toBe(false);
    });

    it('should return true for available subdomain', async () => {
      const isAvailable = await whiteLabelService.isSubdomainAvailable('available-subdomain');
      expect(isAvailable).toBe(true);
    });

    it('should return true for cancelled config subdomain', async () => {
      await whiteLabelService.updateWhiteLabelConfig(testConfigId, { status: 'cancelled' });
      
      const isAvailable = await whiteLabelService.isSubdomainAvailable('test-availability');
      expect(isAvailable).toBe(true);
    });
  });

  describe('deleteConfig', () => {
    beforeEach(async () => {
      const config = await whiteLabelService.createWhiteLabelConfig(
        'Test Organization',
        'test-delete',
        testAdminUserId
      );
      testConfigId = config.id;
    });

    it('should soft delete config by setting status to cancelled', async () => {
      await whiteLabelService.deleteConfig(testConfigId);
      
      // Config should still exist but with cancelled status
      const config = await whiteLabelService.getConfigById(testConfigId);
      expect(config).toBeDefined();
      expect(config?.status).toBe('cancelled');
      
      // Should not be returned by subdomain lookup (only active configs)
      const configBySubdomain = await whiteLabelService.getConfigBySubdomain('test-delete');
      expect(configBySubdomain).toBeNull();
    });

    it('should throw error when config does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        whiteLabelService.deleteConfig(nonExistentId)
      ).rejects.toThrow('White-label configuration not found');
    });
  });
});