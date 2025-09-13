import express from 'express';
import { legalDatabaseService } from '../services/legal-database-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const searchSchema = {
  query: { type: 'string', required: true, minLength: 1, maxLength: 500 },
  jurisdiction: { type: 'array', required: false, items: { type: 'string' } },
  category: { type: 'string', required: false, maxLength: 50 },
  limit: { type: 'number', required: false, min: 1, max: 100 }
};

const resourceIdSchema = {
  id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
  type: { type: 'string', required: true, enum: ['precedent', 'statute'] }
};

/**
 * @route POST /api/legal-database/search-precedents
 * @desc Search legal precedents across multiple databases
 * @access Private
 */
router.post('/search-precedents', authenticateToken, validateRequest(searchSchema), async (req, res) => {
  try {
    const { query, jurisdiction, category, limit } = req.body;

    logger.info(`Precedent search request: "${query}" in jurisdictions: ${jurisdiction?.join(', ') || 'all'}`);

    const searchQuery = {
      query,
      jurisdiction,
      category,
      limit: limit || 20
    };

    const precedents = await legalDatabaseService.searchLegalPrecedents(searchQuery);

    res.json(successResponse({
      precedents,
      count: precedents.length,
      searchQuery: {
        query,
        jurisdiction: jurisdiction || ['all'],
        category: category || 'all'
      }
    }, `Found ${precedents.length} legal precedents`));

  } catch (error) {
    logger.error('Precedent search error:', error);
    res.status(500).json(errorResponse(
      'Precedent search failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/legal-database/search-statutes
 * @desc Search statutes and regulations
 * @access Private
 */
router.post('/search-statutes', authenticateToken, validateRequest(searchSchema), async (req, res) => {
  try {
    const { query, jurisdiction, category, limit } = req.body;

    logger.info(`Statute search request: "${query}" in jurisdictions: ${jurisdiction?.join(', ') || 'all'}`);

    const searchQuery = {
      query,
      jurisdiction,
      category,
      limit: limit || 15
    };

    const statutes = await legalDatabaseService.searchStatutes(searchQuery);

    res.json(successResponse({
      statutes,
      count: statutes.length,
      searchQuery: {
        query,
        jurisdiction: jurisdiction || ['all'],
        category: category || 'all'
      }
    }, `Found ${statutes.length} statutes`));

  } catch (error) {
    logger.error('Statute search error:', error);
    res.status(500).json(errorResponse(
      'Statute search failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/legal-database/search-resources
 * @desc Search all legal resources (precedents, statutes, regulations)
 * @access Private
 */
router.post('/search-resources', authenticateToken, validateRequest(searchSchema), async (req, res) => {
  try {
    const { query, jurisdiction, category, limit } = req.body;

    logger.info(`Legal resource search request: "${query}"`);

    const searchQuery = {
      query,
      jurisdiction,
      category,
      limit: limit || 25
    };

    const resources = await legalDatabaseService.searchLegalResources(searchQuery);

    // Group resources by type
    const groupedResources = resources.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, any[]>);

    res.json(successResponse({
      resources,
      groupedResources,
      totalCount: resources.length,
      counts: {
        precedents: groupedResources.precedent?.length || 0,
        statutes: groupedResources.statute?.length || 0,
        regulations: groupedResources.regulation?.length || 0,
        articles: groupedResources.article?.length || 0
      },
      searchQuery: {
        query,
        jurisdiction: jurisdiction || ['all'],
        category: category || 'all'
      }
    }, `Found ${resources.length} legal resources`));

  } catch (error) {
    logger.error('Legal resource search error:', error);
    res.status(500).json(errorResponse(
      'Legal resource search failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/legal-database/resource/:id
 * @desc Get specific legal resource by ID
 * @access Private
 */
router.get('/resource/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || (type !== 'precedent' && type !== 'statute')) {
      return res.status(400).json(errorResponse(
        'Invalid resource type',
        'Type must be either "precedent" or "statute"'
      ));
    }

    logger.info(`Fetching legal resource: ${id} (type: ${type})`);

    const resource = await legalDatabaseService.getLegalResourceById(
      id, 
      type as 'precedent' | 'statute'
    );

    if (!resource) {
      return res.status(404).json(errorResponse(
        'Resource not found',
        `Legal resource with ID ${id} not found`
      ));
    }

    res.json(successResponse({
      resource,
      type
    }, 'Legal resource retrieved successfully'));

  } catch (error) {
    logger.error('Error fetching legal resource:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch legal resource',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/legal-database/related/:id
 * @desc Get resources related to a specific legal resource
 * @access Private
 */
router.get('/related/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { jurisdiction } = req.query;

    if (!jurisdiction || typeof jurisdiction !== 'string') {
      return res.status(400).json(errorResponse(
        'Missing jurisdiction',
        'Jurisdiction parameter is required'
      ));
    }

    logger.info(`Fetching related resources for: ${id} in jurisdiction: ${jurisdiction}`);

    const relatedResources = await legalDatabaseService.getRelatedResources(id, jurisdiction);

    res.json(successResponse({
      relatedResources,
      count: relatedResources.length,
      resourceId: id,
      jurisdiction
    }, `Found ${relatedResources.length} related resources`));

  } catch (error) {
    logger.error('Error fetching related resources:', error);
    res.status(500).json(errorResponse(
      'Failed to fetch related resources',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route GET /api/legal-database/connections
 * @desc Check status of legal database API connections
 * @access Private
 */
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    logger.info('Checking legal database API connections');

    const connections = await legalDatabaseService.validateApiConnections();

    const totalConnections = Object.keys(connections).length;
    const activeConnections = Object.values(connections).filter(Boolean).length;

    res.json(successResponse({
      connections,
      summary: {
        total: totalConnections,
        active: activeConnections,
        inactive: totalConnections - activeConnections,
        healthScore: activeConnections / totalConnections
      }
    }, `API connections status: ${activeConnections}/${totalConnections} active`));

  } catch (error) {
    logger.error('Error checking API connections:', error);
    res.status(500).json(errorResponse(
      'Failed to check API connections',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

/**
 * @route POST /api/legal-database/advanced-search
 * @desc Advanced search with date ranges and multiple filters
 * @access Private
 */
router.post('/advanced-search', authenticateToken, async (req, res) => {
  try {
    const { 
      query, 
      jurisdiction, 
      category, 
      dateRange, 
      resourceTypes, 
      limit 
    } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json(errorResponse(
        'Invalid query',
        'Query parameter is required and must be non-empty'
      ));
    }

    logger.info(`Advanced legal search: "${query}"`);

    const searchQuery = {
      query: query.trim(),
      jurisdiction,
      category,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined,
      limit: limit || 30
    };

    // Search based on requested resource types
    const results: any = {};
    
    if (!resourceTypes || resourceTypes.includes('precedents')) {
      results.precedents = await legalDatabaseService.searchLegalPrecedents(searchQuery);
    }
    
    if (!resourceTypes || resourceTypes.includes('statutes')) {
      results.statutes = await legalDatabaseService.searchStatutes(searchQuery);
    }
    
    if (!resourceTypes || resourceTypes.includes('all')) {
      results.allResources = await legalDatabaseService.searchLegalResources(searchQuery);
    }

    const totalResults = Object.values(results).reduce((sum: number, arr: any) => 
      sum + (Array.isArray(arr) ? arr.length : 0), 0
    );

    res.json(successResponse({
      results,
      totalResults,
      searchQuery: {
        query,
        jurisdiction: jurisdiction || ['all'],
        category: category || 'all',
        dateRange: dateRange || null,
        resourceTypes: resourceTypes || ['all']
      }
    }, `Advanced search completed: ${totalResults} results found`));

  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json(errorResponse(
      'Advanced search failed',
      error instanceof Error ? error.message : 'Unknown error'
    ));
  }
});

export default router;