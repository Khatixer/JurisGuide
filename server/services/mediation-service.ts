import { Pool } from 'pg';
import { MediationCase, Party, DisputeDetails, MediationEvent, AIMediator, MediationStatus, Document } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class MediationService {
  constructor(private db: Pool) {}

  async createMediationCase(
    parties: Party[],
    dispute: DisputeDetails,
    mediatorConfig: AIMediator
  ): Promise<MediationCase> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const caseId = uuidv4();
      const now = new Date();
      
      // Insert mediation case
      const caseResult = await client.query(
        `INSERT INTO mediation_cases 
         (id, parties, dispute_details, status, ai_mediator_config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          caseId,
          JSON.stringify(parties),
          JSON.stringify(dispute),
          'active',
          JSON.stringify(mediatorConfig),
          now,
          now
        ]
      );

      // Create initial event
      await this.addMediationEvent(caseId, {
        type: 'message',
        content: 'Mediation case created. All parties have been notified.',
        party: 'system',
        metadata: { action: 'case_created' }
      });

      await client.query('COMMIT');
      
      const mediationCase = this.mapRowToMediationCase(caseResult.rows[0]);
      
      logger.info(`Mediation case created: ${caseId}`);
      return mediationCase;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating mediation case:', error);
      throw new Error('Failed to create mediation case');
    } finally {
      client.release();
    }
  }

  async getMediationCase(caseId: string): Promise<MediationCase | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM mediation_cases WHERE id = $1',
        [caseId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const mediationCase = this.mapRowToMediationCase(result.rows[0]);
      
      // Load timeline events
      mediationCase.timeline = await this.getMediationEvents(caseId);
      
      // Load documents
      mediationCase.documents = await this.getCaseDocuments(caseId);
      
      return mediationCase;
      
    } catch (error) {
      logger.error('Error fetching mediation case:', error);
      throw new Error('Failed to fetch mediation case');
    }
  }

  async getMediationCasesByUser(userId: string): Promise<MediationCase[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM mediation_cases 
         WHERE parties::text LIKE $1 
         ORDER BY created_at DESC`,
        [`%"userId":"${userId}"%`]
      );

      const cases = await Promise.all(
        result.rows.map(async (row) => {
          const mediationCase = this.mapRowToMediationCase(row);
          mediationCase.timeline = await this.getMediationEvents(mediationCase.id);
          mediationCase.documents = await this.getCaseDocuments(mediationCase.id);
          return mediationCase;
        })
      );

      return cases;
      
    } catch (error) {
      logger.error('Error fetching user mediation cases:', error);
      throw new Error('Failed to fetch user mediation cases');
    }
  }

  async updateMediationStatus(caseId: string, status: MediationStatus): Promise<void> {
    try {
      const result = await this.db.query(
        'UPDATE mediation_cases SET status = $1, updated_at = $2 WHERE id = $3',
        [status, new Date(), caseId]
      );

      if (result.rowCount === 0) {
        throw new Error('Mediation case not found');
      }

      // Add status change event
      await this.addMediationEvent(caseId, {
        type: 'message',
        content: `Case status changed to: ${status}`,
        party: 'system',
        metadata: { action: 'status_change', newStatus: status }
      });

      logger.info(`Mediation case ${caseId} status updated to: ${status}`);
      
    } catch (error) {
      logger.error('Error updating mediation status:', error);
      throw new Error('Failed to update mediation status');
    }
  }

  async addMediationEvent(
    caseId: string, 
    event: Omit<MediationEvent, 'id' | 'timestamp'>
  ): Promise<MediationEvent> {
    try {
      const eventId = uuidv4();
      const timestamp = new Date();
      
      const result = await this.db.query(
        `INSERT INTO mediation_events 
         (id, case_id, event_type, content, party, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          eventId,
          caseId,
          event.type,
          event.content,
          event.party,
          JSON.stringify(event.metadata || {}),
          timestamp
        ]
      );

      const mediationEvent: MediationEvent = {
        id: result.rows[0].id,
        timestamp: result.rows[0].created_at,
        type: result.rows[0].event_type,
        content: result.rows[0].content,
        party: result.rows[0].party,
        metadata: result.rows[0].metadata
      };

      logger.info(`Mediation event added to case ${caseId}: ${event.type}`);
      return mediationEvent;
      
    } catch (error) {
      logger.error('Error adding mediation event:', error);
      throw new Error('Failed to add mediation event');
    }
  }

  async getMediationEvents(caseId: string): Promise<MediationEvent[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM mediation_events 
         WHERE case_id = $1 
         ORDER BY created_at ASC`,
        [caseId]
      );

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        type: row.event_type,
        content: row.content,
        party: row.party,
        metadata: row.metadata
      }));
      
    } catch (error) {
      logger.error('Error fetching mediation events:', error);
      throw new Error('Failed to fetch mediation events');
    }
  }

  async addPartyToCase(caseId: string, party: Party): Promise<void> {
    try {
      const caseResult = await this.db.query(
        'SELECT parties FROM mediation_cases WHERE id = $1',
        [caseId]
      );

      if (caseResult.rows.length === 0) {
        throw new Error('Mediation case not found');
      }

      const currentParties = caseResult.rows[0].parties as Party[];
      const updatedParties = [...currentParties, party];

      await this.db.query(
        'UPDATE mediation_cases SET parties = $1, updated_at = $2 WHERE id = $3',
        [JSON.stringify(updatedParties), new Date(), caseId]
      );

      // Add event for new party
      await this.addMediationEvent(caseId, {
        type: 'message',
        content: `New party added to mediation: ${party.contactInfo.email}`,
        party: 'system',
        metadata: { action: 'party_added', newParty: party }
      });

      logger.info(`Party added to mediation case ${caseId}`);
      
    } catch (error) {
      logger.error('Error adding party to case:', error);
      throw new Error('Failed to add party to case');
    }
  }

  async getCaseDocuments(caseId: string): Promise<Document[]> {
    try {
      const result = await this.db.query(
        `SELECT id, filename, file_type as type, file_size as size, 
                uploaded_by as "uploadedBy", created_at as "uploadedAt", file_url as url
         FROM documents 
         WHERE case_id = $1 
         ORDER BY created_at DESC`,
        [caseId]
      );

      return result.rows.map(row => ({
        id: row.id,
        filename: row.filename,
        type: row.type,
        size: row.size,
        uploadedBy: row.uploadedBy,
        uploadedAt: row.uploadedAt,
        url: row.url
      }));
      
    } catch (error) {
      logger.error('Error fetching case documents:', error);
      throw new Error('Failed to fetch case documents');
    }
  }

  async generateDisputeSummary(caseId: string): Promise<string> {
    try {
      const mediationCase = await this.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      // Generate neutral dispute summary
      const summary = `
Dispute Summary for Case ${caseId}:

Category: ${mediationCase.dispute.category}
Jurisdiction(s): ${mediationCase.dispute.jurisdiction.join(', ')}

Parties Involved:
${mediationCase.parties.map(party => 
  `- ${party.role}: ${party.contactInfo.email}`
).join('\n')}

Dispute Description:
${mediationCase.dispute.summary}

Cultural Considerations:
${mediationCase.dispute.culturalFactors.join(', ')}

${mediationCase.dispute.proposedResolution ? 
  `Proposed Resolution:\n${mediationCase.dispute.proposedResolution}` : 
  'No proposed resolution provided yet.'
}

Case Status: ${mediationCase.status}
Created: ${mediationCase.createdAt.toISOString()}
      `.trim();

      return summary;
      
    } catch (error) {
      logger.error('Error generating dispute summary:', error);
      throw new Error('Failed to generate dispute summary');
    }
  }

  private mapRowToMediationCase(row: any): MediationCase {
    return {
      id: row.id,
      parties: row.parties,
      dispute: row.dispute_details,
      status: row.status,
      mediator: row.ai_mediator_config,
      documents: [], // Will be loaded separately
      timeline: [], // Will be loaded separately
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}