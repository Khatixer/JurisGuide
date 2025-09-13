import request from 'supertest';
import express from 'express';
import legalDatabaseRoutes from '../../routes/legal-database';
import { legalDatabaseService } from '../../services/legal-database-service';

// Mock the legal database service
jest.mock('../../services/legal-database-service', () => ({
  legalDatabaseService: {
    searchLegalPrecedents: jest.fn(),
    searchStatutes: jest.fn(),
    searchLegalResources: jest.fn(),
    getLegalResourceById: jest.fn(),
    getRelatedResources: jest.fn(),
    validateApiConnections: jest.fn()
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/legal-database', legalDatabaseRoutes);

describe('Legal Database Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/legal-database/search-precedents', () => {
    it('should search legal precedents successfully', async () => {
      const mockPrecedents = [
        {
          id: '1',
          title: 'Test Case v. Example Corp',
          court: 'Supreme Court',
          date: '2023-01-15',
          jurisdiction: 'Federal',
          summary: 'Contract liability case',
          citation: '123 F.3d 456',
          relevanceScore: 0.85,
          keyPoints: ['Contract formation', 'Liability issues']
        }
      ];

      (legalDatabaseService.searchLegalPrecedents as jest.Mock).mockResolvedValue(mockPrecedents);

      const response = await request(app)
        .post('/api/legal-database/search-precedents')
        .send({
          query: 'contract liability',
          jurisdiction: ['federal'],
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.precedents).toEqual(mockPrecedents);
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.searchQuery.query).toBe('contract liability');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/legal-database/search-precedents')
        .send({
          query: '', // Empty query
          jurisdiction: ['federal']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      (legalDatabaseService.searchLegalPrecedents as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/legal-database/search-precedents')
        .send({
          query: 'contract liability',
          jurisdiction: ['federal']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Precedent search failed');
    });
  });

  describe('POST /api/legal-database/search-statutes', () => {
    it('should search statutes successfully', async () => {
      const mockStatutes = [
        {
          id: 'ca-civ-1',
          title: 'California Civil Code Section 1',
          code: 'CIV',
          section: '1',
          jurisdiction: 'california',
          text: 'Contract formation requirements...',
          lastUpdated: '2023-01-01',
          category: 'contract',
          relatedStatutes: []
        }
      ];

      (legalDatabaseService.searchStatutes as jest.Mock).mockResolvedValue(mockStatutes);

      const response = await request(app)
        .post('/api/legal-database/search-statutes')
        .send({
          query: 'contract formation',
          jurisdiction: ['california'],
          limit: 15
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statutes).toEqual(mockStatutes);
      expect(response.body.data.count).toBe(1);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/legal-database/search-statutes')
        .send({
          // Missing query
          jurisdiction: ['california']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/legal-database/search-resources', () => {
    it('should search all legal resources successfully', async () => {
      const mockResources = [
        {
          id: '1',
          type: 'precedent',
          title: 'Test Case',
          jurisdiction: 'federal',
          relevanceScore: 0.9,
          summary: 'Contract case summary',
          metadata: { court: 'Supreme Court' }
        },
        {
          id: '2',
          type: 'statute',
          title: 'Contract Law Statute',
          jurisdiction: 'california',
          relevanceScore: 0.8,
          summary: 'Statute summary',
          metadata: { code: 'CIV', section: '1' }
        }
      ];

      (legalDatabaseService.searchLegalResources as jest.Mock).mockResolvedValue(mockResources);

      const response = await request(app)
        .post('/api/legal-database/search-resources')
        .send({
          query: 'contract law',
          jurisdiction: ['federal', 'california'],
          limit: 25
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toEqual(mockResources);
      expect(response.body.data.totalCount).toBe(2);
      expect(response.body.data.counts.precedents).toBe(1);
      expect(response.body.data.counts.statutes).toBe(1);
    });

    it('should group resources by type', async () => {
      const mockResources = [
        {
          id: '1',
          type: 'precedent',
          title: 'Case 1',
          jurisdiction: 'federal',
          relevanceScore: 0.9,
          summary: 'Summary 1',
          metadata: {}
        },
        {
          id: '2',
          type: 'precedent',
          title: 'Case 2',
          jurisdiction: 'federal',
          relevanceScore: 0.8,
          summary: 'Summary 2',
          metadata: {}
        }
      ];

      (legalDatabaseService.searchLegalResources as jest.Mock).mockResolvedValue(mockResources);

      const response = await request(app)
        .post('/api/legal-database/search-resources')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.groupedResources.precedent).toHaveLength(2);
    });
  });

  describe('GET /api/legal-database/resource/:id', () => {
    it('should fetch legal resource by ID', async () => {
      const mockResource = {
        id: 'test-id',
        title: 'Test Case',
        court: 'Supreme Court',
        date: '2023-01-15',
        jurisdiction: 'federal',
        summary: 'Test case summary',
        citation: '123 F.3d 456',
        relevanceScore: 0.9,
        keyPoints: ['Key point 1', 'Key point 2']
      };

      (legalDatabaseService.getLegalResourceById as jest.Mock).mockResolvedValue(mockResource);

      const response = await request(app)
        .get('/api/legal-database/resource/test-id?type=precedent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resource).toEqual(mockResource);
      expect(response.body.data.type).toBe('precedent');
    });

    it('should return 400 for invalid resource type', async () => {
      const response = await request(app)
        .get('/api/legal-database/resource/test-id?type=invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid resource type');
    });

    it('should return 404 for non-existent resource', async () => {
      (legalDatabaseService.getLegalResourceById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/legal-database/resource/nonexistent?type=precedent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Resource not found');
    });

    it('should return 400 for missing type parameter', async () => {
      const response = await request(app)
        .get('/api/legal-database/resource/test-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/legal-database/related/:id', () => {
    it('should fetch related resources', async () => {
      const mockRelatedResources = [
        {
          id: 'related-1',
          type: 'precedent',
          title: 'Related Case 1',
          jurisdiction: 'federal',
          relevanceScore: 0.7,
          summary: 'Related case summary',
          metadata: {}
        }
      ];

      (legalDatabaseService.getRelatedResources as jest.Mock).mockResolvedValue(mockRelatedResources);

      const response = await request(app)
        .get('/api/legal-database/related/test-id?jurisdiction=federal');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.relatedResources).toEqual(mockRelatedResources);
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.resourceId).toBe('test-id');
      expect(response.body.data.jurisdiction).toBe('federal');
    });

    it('should return 400 for missing jurisdiction', async () => {
      const response = await request(app)
        .get('/api/legal-database/related/test-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing jurisdiction');
    });
  });

  describe('GET /api/legal-database/connections', () => {
    it('should check API connections status', async () => {
      const mockConnections = {
        courtlistener: true,
        casetext: false,
        openlegal: true
      };

      (legalDatabaseService.validateApiConnections as jest.Mock).mockResolvedValue(mockConnections);

      const response = await request(app)
        .get('/api/legal-database/connections');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connections).toEqual(mockConnections);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.active).toBe(2);
      expect(response.body.data.summary.inactive).toBe(1);
      expect(response.body.data.summary.healthScore).toBeCloseTo(0.67, 2);
    });

    it('should handle connection check errors', async () => {
      (legalDatabaseService.validateApiConnections as jest.Mock).mockRejectedValue(
        new Error('Connection check failed')
      );

      const response = await request(app)
        .get('/api/legal-database/connections');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/legal-database/advanced-search', () => {
    it('should perform advanced search successfully', async () => {
      const mockPrecedents = [{ id: '1', title: 'Case 1' }];
      const mockStatutes = [{ id: '2', title: 'Statute 1' }];

      (legalDatabaseService.searchLegalPrecedents as jest.Mock).mockResolvedValue(mockPrecedents);
      (legalDatabaseService.searchStatutes as jest.Mock).mockResolvedValue(mockStatutes);

      const response = await request(app)
        .post('/api/legal-database/advanced-search')
        .send({
          query: 'contract law',
          jurisdiction: ['federal'],
          category: 'contract',
          dateRange: {
            start: '2020-01-01',
            end: '2023-12-31'
          },
          resourceTypes: ['precedents', 'statutes'],
          limit: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results.precedents).toEqual(mockPrecedents);
      expect(response.body.data.results.statutes).toEqual(mockStatutes);
      expect(response.body.data.totalResults).toBe(2);
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/legal-database/advanced-search')
        .send({
          query: '',
          jurisdiction: ['federal']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid query');
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/legal-database/advanced-search')
        .send({
          jurisdiction: ['federal']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should search all resources when no resource types specified', async () => {
      const mockResources = [{ id: '1', type: 'precedent', title: 'Resource 1' }];

      (legalDatabaseService.searchLegalResources as jest.Mock).mockResolvedValue(mockResources);

      const response = await request(app)
        .post('/api/legal-database/advanced-search')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.results.allResources).toEqual(mockResources);
    });
  });
});