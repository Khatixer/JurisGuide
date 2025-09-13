import axios from 'axios';
import { logger } from '../utils/logger';

interface LegalPrecedent {
  id: string;
  title: string;
  court: string;
  date: string;
  jurisdiction: string;
  summary: string;
  citation: string;
  relevanceScore: number;
  fullText?: string;
  keyPoints: string[];
}

interface Statute {
  id: string;
  title: string;
  code: string;
  section: string;
  jurisdiction: string;
  text: string;
  lastUpdated: string;
  category: string;
  relatedStatutes: string[];
}

interface LegalResource {
  id: string;
  type: 'precedent' | 'statute' | 'regulation' | 'article';
  title: string;
  jurisdiction: string;
  relevanceScore: number;
  summary: string;
  url?: string;
  metadata: Record<string, any>;
}

interface SearchQuery {
  query: string;
  jurisdiction?: string[];
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
}

export class LegalDatabaseService {
  private caseTextApiKey: string;
  private westlawApiKey: string;
  private justiaApiKey: string;
  private baseUrls: Record<string, string>;

  constructor() {
    this.caseTextApiKey = process.env.CASETEXT_API_KEY || '';
    this.westlawApiKey = process.env.WESTLAW_API_KEY || '';
    this.justiaApiKey = process.env.JUSTIA_API_KEY || '';
    
    this.baseUrls = {
      casetext: 'https://api.casetext.com/v1',
      westlaw: 'https://api.westlaw.com/v1',
      justia: 'https://api.justia.com/v1',
      courtlistener: 'https://www.courtlistener.com/api/rest/v3',
      openlegal: 'https://api.openlegal.io/v1'
    };
  }

  async searchLegalPrecedents(searchQuery: SearchQuery): Promise<LegalPrecedent[]> {
    try {
      logger.info(`Searching legal precedents for: ${searchQuery.query}`);
      
      const results: LegalPrecedent[] = [];
      
      // Search multiple databases in parallel
      const searchPromises = [
        this.searchCourtListener(searchQuery),
        this.searchCaseText(searchQuery),
        this.searchOpenLegal(searchQuery)
      ];

      const searchResults = await Promise.allSettled(searchPromises);
      
      searchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
        } else {
          logger.error(`Search failed for database ${index}:`, result.reason);
        }
      });

      // Sort by relevance score and limit results
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, searchQuery.limit || 20);

      logger.info(`Found ${sortedResults.length} legal precedents`);
      return sortedResults;

    } catch (error) {
      logger.error('Error searching legal precedents:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Legal precedent search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchStatutes(searchQuery: SearchQuery): Promise<Statute[]> {
    try {
      logger.info(`Searching statutes for: ${searchQuery.query}`);
      
      const results: Statute[] = [];
      
      // Search jurisdiction-specific statute databases
      if (searchQuery.jurisdiction) {
        for (const jurisdiction of searchQuery.jurisdiction) {
          const jurisdictionResults = await this.searchJurisdictionStatutes(
            searchQuery.query, 
            jurisdiction
          );
          results.push(...jurisdictionResults);
        }
      } else {
        // Search general statute databases
        const generalResults = await this.searchGeneralStatutes(searchQuery.query);
        results.push(...generalResults);
      }

      // Sort by relevance and jurisdiction priority
      const sortedResults = results
        .sort((a, b) => {
          // Prioritize exact jurisdiction matches
          if (searchQuery.jurisdiction?.includes(a.jurisdiction) && 
              !searchQuery.jurisdiction?.includes(b.jurisdiction)) {
            return -1;
          }
          if (!searchQuery.jurisdiction?.includes(a.jurisdiction) && 
              searchQuery.jurisdiction?.includes(b.jurisdiction)) {
            return 1;
          }
          return b.lastUpdated.localeCompare(a.lastUpdated);
        })
        .slice(0, searchQuery.limit || 15);

      logger.info(`Found ${sortedResults.length} statutes`);
      return sortedResults;

    } catch (error) {
      logger.error('Error searching statutes:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Statute search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchLegalResources(searchQuery: SearchQuery): Promise<LegalResource[]> {
    try {
      logger.info(`Searching legal resources for: ${searchQuery.query}`);
      
      // Search both precedents and statutes
      const [precedents, statutes] = await Promise.all([
        this.searchLegalPrecedents(searchQuery),
        this.searchStatutes(searchQuery)
      ]);

      // Convert to unified resource format
      const resources: LegalResource[] = [
        ...precedents.map(p => this.precedentToResource(p)),
        ...statutes.map(s => this.statuteToResource(s))
      ];

      // Sort by relevance score
      const sortedResources = resources
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, searchQuery.limit || 25);

      logger.info(`Found ${sortedResources.length} legal resources`);
      return sortedResources;

    } catch (error) {
      logger.error('Error searching legal resources:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Legal resource search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchCourtListener(searchQuery: SearchQuery): Promise<LegalPrecedent[]> {
    try {
      const params = new URLSearchParams({
        q: searchQuery.query,
        type: 'o', // Opinions
        order_by: 'score desc',
        format: 'json'
      });

      if (searchQuery.jurisdiction) {
        params.append('court', searchQuery.jurisdiction.join(','));
      }

      const response = await axios.get(`${this.baseUrls.courtlistener}/search/?${params}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'JurisGuide/1.0'
        }
      });

      return response.data.results?.map((item: any) => ({
        id: item.id.toString(),
        title: item.caseName || item.snippet || 'Untitled Case',
        court: item.court || 'Unknown Court',
        date: item.dateFiled || new Date().toISOString(),
        jurisdiction: this.extractJurisdiction(item.court),
        summary: item.snippet || 'No summary available',
        citation: item.citation?.join(', ') || 'No citation',
        relevanceScore: this.calculateRelevanceScore(item, searchQuery.query),
        keyPoints: this.extractKeyPoints(item.snippet || ''),
        fullText: item.plain_text
      })) || [];

    } catch (error) {
      logger.error('CourtListener search error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchCaseText(searchQuery: SearchQuery): Promise<LegalPrecedent[]> {
    if (!this.caseTextApiKey) {
      logger.warn('CaseText API key not configured');
      return [];
    }

    try {
      const response = await axios.post(`${this.baseUrls.casetext}/search`, {
        query: searchQuery.query,
        jurisdiction: searchQuery.jurisdiction,
        limit: 10
      }, {
        headers: {
          'Authorization': `Bearer ${this.caseTextApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data.results?.map((item: any) => ({
        id: item.id,
        title: item.title,
        court: item.court,
        date: item.date,
        jurisdiction: item.jurisdiction,
        summary: item.summary,
        citation: item.citation,
        relevanceScore: item.score || 0.5,
        keyPoints: item.keyPoints || [],
        fullText: item.fullText
      })) || [];

    } catch (error) {
      logger.error('CaseText search error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchOpenLegal(searchQuery: SearchQuery): Promise<LegalPrecedent[]> {
    try {
      const params = new URLSearchParams({
        q: searchQuery.query,
        format: 'json',
        limit: '10'
      });

      const response = await axios.get(`${this.baseUrls.openlegal}/cases/search?${params}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'JurisGuide/1.0'
        }
      });

      return response.data.cases?.map((item: any) => ({
        id: item.id,
        title: item.name || item.title,
        court: item.court?.name || 'Unknown Court',
        date: item.decision_date || new Date().toISOString(),
        jurisdiction: item.jurisdiction || 'Unknown',
        summary: item.summary || item.snippet || 'No summary available',
        citation: item.citations?.join(', ') || 'No citation',
        relevanceScore: this.calculateRelevanceScore(item, searchQuery.query),
        keyPoints: this.extractKeyPoints(item.summary || ''),
        fullText: item.text
      })) || [];

    } catch (error) {
      logger.error('OpenLegal search error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchJurisdictionStatutes(query: string, jurisdiction: string): Promise<Statute[]> {
    try {
      // Mock implementation - in real scenario, this would connect to jurisdiction-specific APIs
      const mockStatutes: Statute[] = [
        {
          id: `${jurisdiction}-statute-1`,
          title: `${jurisdiction} Civil Code Section 1`,
          code: 'CIV',
          section: '1',
          jurisdiction,
          text: `Mock statute text for ${query} in ${jurisdiction}`,
          lastUpdated: new Date().toISOString(),
          category: 'civil',
          relatedStatutes: []
        }
      ];

      // Filter based on query relevance
      return mockStatutes.filter(statute => 
        statute.title.toLowerCase().includes(query.toLowerCase()) ||
        statute.text.toLowerCase().includes(query.toLowerCase())
      );

    } catch (error) {
      logger.error(`Error searching ${jurisdiction} statutes:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchGeneralStatutes(query: string): Promise<Statute[]> {
    try {
      // Mock implementation for general statute search
      const mockStatutes: Statute[] = [
        {
          id: 'general-statute-1',
          title: 'General Contract Law',
          code: 'GEN',
          section: '100',
          jurisdiction: 'Federal',
          text: `General statute text related to ${query}`,
          lastUpdated: new Date().toISOString(),
          category: 'contract',
          relatedStatutes: []
        }
      ];

      return mockStatutes.filter(statute => 
        statute.title.toLowerCase().includes(query.toLowerCase()) ||
        statute.text.toLowerCase().includes(query.toLowerCase())
      );

    } catch (error) {
      logger.error('Error searching general statutes:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private precedentToResource(precedent: LegalPrecedent): LegalResource {
    return {
      id: precedent.id,
      type: 'precedent',
      title: precedent.title,
      jurisdiction: precedent.jurisdiction,
      relevanceScore: precedent.relevanceScore,
      summary: precedent.summary,
      metadata: {
        court: precedent.court,
        date: precedent.date,
        citation: precedent.citation,
        keyPoints: precedent.keyPoints
      }
    };
  }

  private statuteToResource(statute: Statute): LegalResource {
    return {
      id: statute.id,
      type: 'statute',
      title: statute.title,
      jurisdiction: statute.jurisdiction,
      relevanceScore: 0.8, // Default relevance for statutes
      summary: statute.text.substring(0, 200) + '...',
      metadata: {
        code: statute.code,
        section: statute.section,
        category: statute.category,
        lastUpdated: statute.lastUpdated,
        relatedStatutes: statute.relatedStatutes
      }
    };
  }

  private calculateRelevanceScore(item: any, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    const text = (item.snippet || item.summary || item.title || '').toLowerCase();
    
    let score = 0;
    queryTerms.forEach(term => {
      if (text.includes(term)) {
        score += 0.2;
      }
    });

    // Boost score for recent cases
    if (item.dateFiled || item.date) {
      const date = new Date(item.dateFiled || item.date);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 365) score += 0.2; // Recent cases get boost
      if (daysDiff < 30) score += 0.1;  // Very recent cases get extra boost
    }

    return Math.min(score, 1.0);
  }

  private extractJurisdiction(court: string): string {
    if (!court) return 'Unknown';
    
    // Extract jurisdiction from court name
    if (court.includes('Supreme Court')) return 'Federal';
    if (court.includes('Circuit')) return 'Federal';
    if (court.includes('District')) return 'Federal';
    
    // State courts
    const stateMatch = court.match(/(\w+)\s+(Supreme|Superior|District)/);
    if (stateMatch) return stateMatch[1];
    
    return 'Unknown';
  }

  private extractKeyPoints(text: string): string[] {
    if (!text) return [];
    
    // Simple extraction of key points from text
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  async getLegalResourceById(id: string, type: 'precedent' | 'statute'): Promise<LegalPrecedent | Statute | null> {
    try {
      if (type === 'precedent') {
        // Search for specific precedent by ID
        const searchResult = await this.searchLegalPrecedents({ query: id, limit: 1 });
        return searchResult.find(p => p.id === id) || null;
      } else {
        // Search for specific statute by ID
        const searchResult = await this.searchStatutes({ query: id, limit: 1 });
        return searchResult.find(s => s.id === id) || null;
      }
    } catch (error) {
      logger.error(`Error fetching legal resource ${id}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async getRelatedResources(resourceId: string, jurisdiction: string): Promise<LegalResource[]> {
    try {
      // Find resources related to the given resource
      const searchQuery: SearchQuery = {
        query: resourceId,
        jurisdiction: [jurisdiction],
        limit: 10
      };

      const resources = await this.searchLegalResources(searchQuery);
      return resources.filter(r => r.id !== resourceId);

    } catch (error) {
      logger.error('Error fetching related resources:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  async validateApiConnections(): Promise<Record<string, boolean>> {
    const connections: Record<string, boolean> = {};

    // Test CourtListener
    try {
      await axios.get(`${this.baseUrls.courtlistener}/search/?q=test&type=o&format=json`, {
        timeout: 5000,
        headers: { 'User-Agent': 'JurisGuide/1.0' }
      });
      connections.courtlistener = true;
    } catch {
      connections.courtlistener = false;
    }

    // Test CaseText (if API key available)
    if (this.caseTextApiKey) {
      try {
        await axios.post(`${this.baseUrls.casetext}/search`, 
          { query: 'test', limit: 1 },
          {
            headers: { 'Authorization': `Bearer ${this.caseTextApiKey}` },
            timeout: 5000
          }
        );
        connections.casetext = true;
      } catch {
        connections.casetext = false;
      }
    } else {
      connections.casetext = false;
    }

    // Test OpenLegal
    try {
      await axios.get(`${this.baseUrls.openlegal}/cases/search?q=test&limit=1`, {
        timeout: 5000,
        headers: { 'User-Agent': 'JurisGuide/1.0' }
      });
      connections.openlegal = true;
    } catch {
      connections.openlegal = false;
    }

    return connections;
  }
}

export const legalDatabaseService = new LegalDatabaseService();