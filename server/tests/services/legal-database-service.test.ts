import { LegalDatabaseService } from '../../services/legal-database-service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LegalDatabaseService', () => {
  let legalDatabaseService: LegalDatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    legalDatabaseService = new LegalDatabaseService();
  });

  describe('searchLegalPrecedents', () => {
    it('should search legal precedents successfully', async () => {
      const mockCourtListenerResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Test Case v. Example Corp',
              court: 'Supreme Court',
              dateFiled: '2023-01-15',
              snippet: 'This case involves contract law and liability issues',
              citation: ['123 F.3d 456'],
              plain_text: 'Full case text here...'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockCourtListenerResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const searchQuery = {
        query: 'contract liability',
        jurisdiction: ['federal'],
        limit: 10
      };

      const results = await legalDatabaseService.searchLegalPrecedents(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Case v. Example Corp');
      expect(results[0].court).toBe('Supreme Court');
      expect(results[0].jurisdiction).toBe('Federal');
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should handle search errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const searchQuery = {
        query: 'test query',
        limit: 5
      };

      const results = await legalDatabaseService.searchLegalPrecedents(searchQuery);

      expect(results).toHaveLength(0);
    });

    it('should sort results by relevance score', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Low Relevance Case',
              court: 'District Court',
              dateFiled: '2020-01-01',
              snippet: 'Unrelated content',
              citation: ['111 F.3d 111']
            },
            {
              id: 2,
              caseName: 'High Relevance Contract Case',
              court: 'Supreme Court',
              dateFiled: '2023-01-01',
              snippet: 'This case involves contract liability issues',
              citation: ['222 F.3d 222']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.searchLegalPrecedents({
        query: 'contract liability',
        limit: 10
      });

      expect(results).toHaveLength(2);
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
    });
  });

  describe('searchStatutes', () => {
    it('should search statutes for specific jurisdiction', async () => {
      const searchQuery = {
        query: 'contract law',
        jurisdiction: ['california'],
        limit: 5
      };

      const results = await legalDatabaseService.searchStatutes(searchQuery);

      expect(Array.isArray(results)).toBe(true);
      // Results should be filtered for the specified jurisdiction
      results.forEach(statute => {
        expect(statute.jurisdiction).toBe('california');
      });
    });

    it('should search general statutes when no jurisdiction specified', async () => {
      const searchQuery = {
        query: 'contract law',
        limit: 5
      };

      const results = await legalDatabaseService.searchStatutes(searchQuery);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle statute search errors', async () => {
      const searchQuery = {
        query: 'invalid query that causes error',
        jurisdiction: ['nonexistent'],
        limit: 5
      };

      // Should not throw error, but return empty array
      await expect(legalDatabaseService.searchStatutes(searchQuery)).resolves.not.toThrow();
    });
  });

  describe('searchLegalResources', () => {
    it('should search both precedents and statutes', async () => {
      const mockCourtListenerResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Test Case',
              court: 'Supreme Court',
              dateFiled: '2023-01-15',
              snippet: 'Contract case',
              citation: ['123 F.3d 456']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockCourtListenerResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const searchQuery = {
        query: 'contract',
        limit: 10
      };

      const results = await legalDatabaseService.searchLegalResources(searchQuery);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should contain both precedents and statutes
      const types = results.map(r => r.type);
      expect(types).toContain('precedent');
    });

    it('should sort resources by relevance score', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Relevant Case',
              court: 'Supreme Court',
              dateFiled: '2023-01-01',
              snippet: 'contract liability',
              citation: ['111 F.3d 111']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.searchLegalResources({
        query: 'contract liability',
        limit: 10
      });

      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });
  });

  describe('getLegalResourceById', () => {
    it('should fetch precedent by ID', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 'test-id',
              caseName: 'Test Case',
              court: 'Supreme Court',
              dateFiled: '2023-01-15',
              snippet: 'Test case content',
              citation: ['123 F.3d 456']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const result = await legalDatabaseService.getLegalResourceById('test-id', 'precedent');

      expect(result).toBeDefined();
      if (result) {
        expect(result.id).toBe('1'); // CourtListener returns numeric ID
      }
    });

    it('should return null for non-existent resource', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const result = await legalDatabaseService.getLegalResourceById('nonexistent', 'precedent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await legalDatabaseService.getLegalResourceById('test-id', 'precedent');

      expect(result).toBeNull();
    });
  });

  describe('getRelatedResources', () => {
    it('should find related resources', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Related Case',
              court: 'District Court',
              dateFiled: '2023-01-15',
              snippet: 'Related case content',
              citation: ['456 F.3d 789']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.getRelatedResources('test-id', 'federal');

      expect(Array.isArray(results)).toBe(true);
      // Should not include the original resource
      expect(results.every(r => r.id !== 'test-id')).toBe(true);
    });

    it('should handle errors in related resource search', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const results = await legalDatabaseService.getRelatedResources('test-id', 'federal');

      expect(results).toEqual([]);
    });
  });

  describe('validateApiConnections', () => {
    it('should validate API connections', async () => {
      // Mock successful connections
      mockedAxios.get.mockResolvedValue({ data: { results: [] } });
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const connections = await legalDatabaseService.validateApiConnections();

      expect(connections).toHaveProperty('courtlistener');
      expect(connections).toHaveProperty('casetext');
      expect(connections).toHaveProperty('openlegal');
      expect(typeof connections.courtlistener).toBe('boolean');
    });

    it('should handle failed connections', async () => {
      // Mock failed connections
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));
      mockedAxios.post.mockRejectedValue(new Error('Connection failed'));

      const connections = await legalDatabaseService.validateApiConnections();

      expect(connections.courtlistener).toBe(false);
      expect(connections.openlegal).toBe(false);
    });
  });

  describe('private helper methods', () => {
    it('should calculate relevance score correctly', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Contract Liability Case',
              court: 'Supreme Court',
              dateFiled: '2023-12-01', // Recent date
              snippet: 'This case involves contract and liability issues',
              citation: ['123 F.3d 456']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.searchLegalPrecedents({
        query: 'contract liability',
        limit: 1
      });

      expect(results[0].relevanceScore).toBeGreaterThan(0);
      // Recent cases with matching terms should have higher scores
      expect(results[0].relevanceScore).toBeGreaterThan(0.3);
    });

    it('should extract jurisdiction correctly', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Test Case',
              court: 'California Supreme Court',
              dateFiled: '2023-01-15',
              snippet: 'Test content',
              citation: ['123 Cal.3d 456']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.searchLegalPrecedents({
        query: 'test',
        limit: 1
      });

      expect(results[0].jurisdiction).toBe('California');
    });

    it('should extract key points from text', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              caseName: 'Test Case',
              court: 'Supreme Court',
              dateFiled: '2023-01-15',
              snippet: 'This is the first key point. This is the second important point. This is the third significant finding. This is a fourth point.',
              citation: ['123 F.3d 456']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      mockedAxios.post.mockResolvedValue({ data: { results: [] } });

      const results = await legalDatabaseService.searchLegalPrecedents({
        query: 'test',
        limit: 1
      });

      expect(results[0].keyPoints).toHaveLength(3); // Should extract first 3 sentences
      expect(results[0].keyPoints[0]).toContain('first key point');
    });
  });
});