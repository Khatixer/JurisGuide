import { Pool } from 'pg';
import { MediationService } from '../../services/mediation-service';
import { Party, DisputeDetails, AIMediator, MediationStatus } from '../../types';

// Mock the database
const mockDb = {
  connect: jest.fn(),
  query: jest.fn(),
} as unknown as Pool;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('MediationService', () => {
  let mediationService: MediationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mediationService = new MediationService(mockDb);
    (mockDb.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('createMediationCase', () => {
    const mockParties: Party[] = [
      {
        userId: 'user1',
        role: 'plaintiff',
        contactInfo: { email: 'user1@example.com' }
      },
      {
        userId: 'user2',
        role: 'defendant',
        contactInfo: { email: 'user2@example.com' }
      }
    ];

    const mockDispute: DisputeDetails = {
      summary: 'Contract dispute over payment terms',
      category: 'contract_dispute',
      jurisdiction: ['US', 'CA'],
      culturalFactors: ['business_culture'],
      proposedResolution: 'Negotiate payment schedule'
    };

    const mockMediator: AIMediator = {
      model: 'gpt-4',
      configuration: {
        culturalSensitivity: true,
        jurisdictionAware: true,
        language: 'en'
      }
    };

    it('should create a mediation case successfully', async () => {
      const mockCaseRow = {
        id: 'case-123',
        parties: mockParties,
        dispute_details: mockDispute,
        status: 'active',
        ai_mediator_config: mockMediator,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCaseRow] }) // INSERT case
        .mockResolvedValueOnce({ rows: [] }); // INSERT event

      const result = await mediationService.createMediationCase(
        mockParties,
        mockDispute,
        mockMediator
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.id).toBe('case-123');
      expect(result.parties).toEqual(mockParties);
      expect(result.dispute).toEqual(mockDispute);
      expect(result.status).toBe('active');
    });

    it('should rollback transaction on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        mediationService.createMediationCase(mockParties, mockDispute, mockMediator)
      ).rejects.toThrow('Failed to create mediation case');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getMediationCase', () => {
    it('should return mediation case with timeline and documents', async () => {
      const mockCaseRow = {
        id: 'case-123',
        parties: [{ userId: 'user1', role: 'plaintiff' }],
        dispute_details: { summary: 'Test dispute' },
        status: 'active',
        ai_mediator_config: { model: 'gpt-4' },
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockEvents = [
        {
          id: 'event-1',
          created_at: new Date(),
          event_type: 'message',
          content: 'Case created',
          party: 'system',
          metadata: {}
        }
      ];

      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'contract.pdf',
          file_type: 'pdf',
          file_size: 1024,
          uploaded_by: 'user1',
          created_at: new Date(),
          file_url: '/uploads/contract.pdf'
        }
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockCaseRow] }) // Get case
        .mockResolvedValueOnce({ rows: mockEvents }) // Get events
        .mockResolvedValueOnce({ rows: mockDocuments }); // Get documents

      const result = await mediationService.getMediationCase('case-123');

      expect(result).toBeTruthy();
      expect(result!.id).toBe('case-123');
      expect(result!.timeline).toHaveLength(1);
      expect(result!.documents).toHaveLength(1);
    });

    it('should return null for non-existent case', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await mediationService.getMediationCase('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMediationCasesByUser', () => {
    it('should return user mediation cases', async () => {
      const mockCaseRows = [
        {
          id: 'case-1',
          parties: [{ userId: 'user1', role: 'plaintiff' }],
          dispute_details: { summary: 'Dispute 1' },
          status: 'active',
          ai_mediator_config: { model: 'gpt-4' },
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockCaseRows }) // Get cases
        .mockResolvedValueOnce({ rows: [] }) // Get events for case 1
        .mockResolvedValueOnce({ rows: [] }); // Get documents for case 1

      const result = await mediationService.getMediationCasesByUser('user1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('case-1');
    });
  });

  describe('updateMediationStatus', () => {
    it('should update mediation status successfully', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1 }) // Update status
        .mockResolvedValueOnce({ rows: [] }); // Add event

      await mediationService.updateMediationStatus('case-123', 'resolved');

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE mediation_cases SET status = $1, updated_at = $2 WHERE id = $3',
        expect.arrayContaining(['resolved', expect.any(Date), 'case-123'])
      );
    });

    it('should throw error for non-existent case', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await expect(
        mediationService.updateMediationStatus('non-existent', 'resolved')
      ).rejects.toThrow('Mediation case not found');
    });
  });

  describe('addMediationEvent', () => {
    it('should add mediation event successfully', async () => {
      const mockEventRow = {
        id: 'event-123',
        created_at: new Date(),
        event_type: 'message',
        content: 'Test message',
        party: 'user1',
        metadata: {}
      };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [mockEventRow] });

      const result = await mediationService.addMediationEvent('case-123', {
        type: 'message',
        content: 'Test message',
        party: 'user1'
      });

      expect(result.id).toBe('event-123');
      expect(result.type).toBe('message');
      expect(result.content).toBe('Test message');
      expect(result.party).toBe('user1');
    });
  });

  describe('getMediationEvents', () => {
    it('should return mediation events in chronological order', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          created_at: new Date('2023-01-01'),
          event_type: 'message',
          content: 'First message',
          party: 'user1',
          metadata: {}
        },
        {
          id: 'event-2',
          created_at: new Date('2023-01-02'),
          event_type: 'document',
          content: 'Document uploaded',
          party: 'user2',
          metadata: {}
        }
      ];

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: mockEvents });

      const result = await mediationService.getMediationEvents('case-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event-1');
      expect(result[1].id).toBe('event-2');
    });
  });

  describe('addPartyToCase', () => {
    it('should add party to existing case', async () => {
      const existingParties = [
        { userId: 'user1', role: 'plaintiff', contactInfo: { email: 'user1@example.com' } }
      ];
      
      const newParty: Party = {
        userId: 'user2',
        role: 'defendant',
        contactInfo: { email: 'user2@example.com' }
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ parties: existingParties }] }) // Get current parties
        .mockResolvedValueOnce({ rowCount: 1 }) // Update parties
        .mockResolvedValueOnce({ rows: [] }); // Add event

      await mediationService.addPartyToCase('case-123', newParty);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE mediation_cases SET parties = $1, updated_at = $2 WHERE id = $3',
        expect.arrayContaining([
          JSON.stringify([...existingParties, newParty]),
          expect.any(Date),
          'case-123'
        ])
      );
    });

    it('should throw error for non-existent case', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const newParty: Party = {
        userId: 'user2',
        role: 'defendant',
        contactInfo: { email: 'user2@example.com' }
      };

      await expect(
        mediationService.addPartyToCase('non-existent', newParty)
      ).rejects.toThrow('Mediation case not found');
    });
  });

  describe('getCaseDocuments', () => {
    it('should return case documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'contract.pdf',
          file_type: 'pdf',
          file_size: 1024,
          uploaded_by: 'user1',
          created_at: new Date(),
          file_url: '/uploads/contract.pdf'
        }
      ];

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: mockDocuments });

      const result = await mediationService.getCaseDocuments('case-123');

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('contract.pdf');
      expect(result[0].type).toBe('pdf');
    });
  });

  describe('generateDisputeSummary', () => {
    it('should generate comprehensive dispute summary', async () => {
      const mockCase = {
        id: 'case-123',
        parties: [
          { userId: 'user1', role: 'plaintiff', contactInfo: { email: 'user1@example.com' } },
          { userId: 'user2', role: 'defendant', contactInfo: { email: 'user2@example.com' } }
        ],
        dispute: {
          summary: 'Contract payment dispute',
          category: 'contract_dispute',
          jurisdiction: ['US', 'CA'],
          culturalFactors: ['business_culture'],
          proposedResolution: 'Payment plan negotiation'
        },
        status: 'active',
        mediator: { model: 'gpt-4' },
        documents: [],
        timeline: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      // Mock the getMediationCase call
      jest.spyOn(mediationService, 'getMediationCase').mockResolvedValueOnce(mockCase);

      const result = await mediationService.generateDisputeSummary('case-123');

      expect(result).toContain('Dispute Summary for Case case-123');
      expect(result).toContain('contract_dispute');
      expect(result).toContain('US, CA');
      expect(result).toContain('plaintiff: user1@example.com');
      expect(result).toContain('defendant: user2@example.com');
      expect(result).toContain('Contract payment dispute');
      expect(result).toContain('Payment plan negotiation');
    });

    it('should throw error for non-existent case', async () => {
      jest.spyOn(mediationService, 'getMediationCase').mockResolvedValueOnce(null);

      await expect(
        mediationService.generateDisputeSummary('non-existent')
      ).rejects.toThrow('Mediation case not found');
    });
  });
});