import {
  detectJurisdiction,
  categorizeLegalQuery,
  extractLegalConcepts,
  determineUrgency,
  normalizeJurisdiction
} from '../../utils/legal-processing';
import { Location } from '../../types';

describe('Legal Processing Utils', () => {
  describe('detectJurisdiction', () => {
    it('should detect jurisdiction from user location', async () => {
      const userLocation: Location = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'New York',
        country: 'United States',
        postalCode: '10001'
      };

      const jurisdictions = await detectJurisdiction('Contract dispute', userLocation);
      
      expect(jurisdictions).toContain('United States');
      expect(jurisdictions).toContain('United States - New York');
    });

    it('should detect jurisdiction from description keywords', async () => {
      const description = 'I need help with EU GDPR compliance for my business';
      
      const jurisdictions = await detectJurisdiction(description);
      
      expect(jurisdictions).toContain('European Union');
    });

    it('should default to International when no jurisdiction detected', async () => {
      const description = 'General legal advice needed';
      
      const jurisdictions = await detectJurisdiction(description);
      
      expect(jurisdictions).toContain('International');
    });

    it('should detect multiple jurisdictions from description', async () => {
      const description = 'Cross-border contract between USA and Canada companies';
      
      const jurisdictions = await detectJurisdiction(description);
      
      expect(jurisdictions).toContain('United States');
      expect(jurisdictions).toContain('Canada');
      expect(jurisdictions).toContain('International');
    });
  });

  describe('categorizeLegalQuery', () => {
    it('should categorize contract disputes correctly', async () => {
      const description = 'My vendor breached our service agreement and failed to deliver on time';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('contract_dispute');
    });

    it('should categorize employment law issues correctly', async () => {
      const description = 'I was wrongfully terminated from my job without proper notice';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('employment_law');
    });

    it('should categorize family law issues correctly', async () => {
      const description = 'Need help with child custody arrangements after divorce';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('family_law');
    });

    it('should categorize criminal law issues correctly', async () => {
      const description = 'I was arrested for DUI and need legal defense';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('criminal_law');
    });

    it('should return other for unclear descriptions', async () => {
      const description = 'I need some legal help with something';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('other');
    });

    it('should handle intellectual property cases', async () => {
      const description = 'Someone is infringing on my patent and using my invention';
      
      const category = await categorizeLegalQuery(description);
      
      expect(category).toBe('intellectual_property');
    });
  });

  describe('extractLegalConcepts', () => {
    it('should extract relevant legal concepts', () => {
      const description = 'The defendant was negligent and caused damages, we need compensation through litigation';
      
      const concepts = extractLegalConcepts(description);
      
      expect(concepts).toContain('negligent');
      expect(concepts).toContain('damages');
      expect(concepts).toContain('compensation');
      expect(concepts).toContain('litigation');
    });

    it('should return empty array for non-legal text', () => {
      const description = 'This is just a regular conversation about weather';
      
      const concepts = extractLegalConcepts(description);
      
      expect(concepts).toHaveLength(0);
    });

    it('should handle multiple legal concepts', () => {
      const description = 'The breach of contract violated statutory regulations and constitutional rights';
      
      const concepts = extractLegalConcepts(description);
      
      expect(concepts).toContain('breach');
      expect(concepts).toContain('violated');
      expect(concepts).toContain('statutory');
      expect(concepts).toContain('constitutional');
      expect(concepts).toContain('rights');
    });
  });

  describe('determineUrgency', () => {
    it('should detect critical urgency', () => {
      const description = 'Emergency! I have a court hearing tomorrow and need immediate help';
      
      const urgency = determineUrgency(description);
      
      expect(urgency).toBe('critical');
    });

    it('should detect high urgency', () => {
      const description = 'I have a filing deadline next week and need to respond to the summons';
      
      const urgency = determineUrgency(description);
      
      expect(urgency).toBe('high');
    });

    it('should detect medium urgency', () => {
      const description = 'I need legal advice soon for planning my business structure';
      
      const urgency = determineUrgency(description);
      
      expect(urgency).toBe('medium');
    });

    it('should default to low urgency', () => {
      const description = 'General question about legal procedures';
      
      const urgency = determineUrgency(description);
      
      expect(urgency).toBe('low');
    });
  });

  describe('normalizeJurisdiction', () => {
    it('should normalize common abbreviations', () => {
      expect(normalizeJurisdiction('usa')).toBe('United States');
      expect(normalizeJurisdiction('UK')).toBe('United Kingdom');
      expect(normalizeJurisdiction('eu')).toBe('European Union');
    });

    it('should preserve unknown jurisdictions', () => {
      expect(normalizeJurisdiction('Custom Jurisdiction')).toBe('Custom Jurisdiction');
    });

    it('should trim whitespace', () => {
      expect(normalizeJurisdiction('  United States  ')).toBe('United States');
    });
  });
});