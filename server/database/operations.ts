import { Pool, QueryResult, QueryResultRow } from 'pg';
import pool from './config';
import { 
  User, 
  Lawyer, 
  LegalQuery, 
  LegalGuidance,
  MediationCase, 
  MediationEvent,
  Document,
  ApiResponse 
} from '../types';

// Generic database operation wrapper
async function executeQuery<T extends QueryResultRow>(
  query: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(query, params);
    return result;
  } finally {
    client.release();
  }
}

// User operations
export class UserOperations {
  static async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, profile, preferences)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await executeQuery<User>(query, [
      user.email,
      user.passwordHash,
      JSON.stringify(user.profile),
      JSON.stringify(user.preferences)
    ]);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await executeQuery<User>(query, [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await executeQuery<User>(query, [email]);
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.profile) {
      setClause.push(`profile = $${paramIndex++}`);
      values.push(JSON.stringify(updates.profile));
    }
    
    if (updates.preferences) {
      setClause.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(updates.preferences));
    }

    if (setClause.length === 0) return null;

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executeQuery<User>(query, values);
    return result.rows[0] || null;
  }
}

// Legal Query operations
export class LegalQueryOperations {
  static async create(query: Omit<LegalQuery, 'id' | 'createdAt' | 'updatedAt'>): Promise<LegalQuery> {
    const sql = `
      INSERT INTO legal_queries (
        user_id, description, category, jurisdiction, urgency, 
        cultural_context, language, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await executeQuery<LegalQuery>(sql, [
      query.userId,
      query.description,
      query.category,
      query.jurisdiction,
      query.urgency,
      query.culturalContext,
      query.language,
      query.status
    ]);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<LegalQuery | null> {
    const query = 'SELECT * FROM legal_queries WHERE id = $1';
    const result = await executeQuery<LegalQuery>(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<LegalQuery[]> {
    const query = 'SELECT * FROM legal_queries WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await executeQuery<LegalQuery>(query, [userId]);
    return result.rows;
  }

  static async updateStatus(id: string, status: LegalQuery['status']): Promise<LegalQuery | null> {
    const query = `
      UPDATE legal_queries 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await executeQuery<LegalQuery>(query, [status, id]);
    return result.rows[0] || null;
  }
}

// Lawyer operations
export class LawyerOperations {
  static async create(lawyer: Omit<Lawyer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lawyer> {
    const query = `
      INSERT INTO lawyers (
        profile, specializations, location, availability, 
        pricing, ratings, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await executeQuery<Lawyer>(query, [
      JSON.stringify(lawyer.profile),
      lawyer.specializations,
      JSON.stringify(lawyer.location),
      JSON.stringify(lawyer.availability),
      JSON.stringify(lawyer.pricing),
      JSON.stringify(lawyer.ratings),
      lawyer.verificationStatus
    ]);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<Lawyer | null> {
    const query = 'SELECT * FROM lawyers WHERE id = $1';
    const result = await executeQuery<Lawyer>(query, [id]);
    return result.rows[0] || null;
  }

  static async findBySpecialization(specialization: string): Promise<Lawyer[]> {
    const query = 'SELECT * FROM lawyers WHERE $1 = ANY(specializations) AND verification_status = $2';
    const result = await executeQuery<Lawyer>(query, [specialization, 'verified']);
    return result.rows;
  }

  static async updateVerificationStatus(
    id: string, 
    status: Lawyer['verificationStatus']
  ): Promise<Lawyer | null> {
    const query = `
      UPDATE lawyers 
      SET verification_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await executeQuery<Lawyer>(query, [status, id]);
    return result.rows[0] || null;
  }
}

// Mediation Case operations
export class MediationCaseOperations {
  static async create(
    mediationCase: Omit<MediationCase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MediationCase> {
    const query = `
      INSERT INTO mediation_cases (
        parties, dispute_details, status, ai_mediator_config, documents, timeline
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await executeQuery<MediationCase>(query, [
      JSON.stringify(mediationCase.parties),
      JSON.stringify(mediationCase.dispute),
      mediationCase.status,
      JSON.stringify(mediationCase.mediator),
      JSON.stringify(mediationCase.documents),
      JSON.stringify(mediationCase.timeline)
    ]);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<MediationCase | null> {
    const query = 'SELECT * FROM mediation_cases WHERE id = $1';
    const result = await executeQuery<MediationCase>(query, [id]);
    return result.rows[0] || null;
  }

  static async addEvent(caseId: string, event: Omit<MediationEvent, 'id'>): Promise<MediationEvent> {
    const query = `
      INSERT INTO mediation_events (case_id, event_type, content, party, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await executeQuery<MediationEvent>(query, [
      caseId,
      event.type,
      event.content,
      event.party,
      JSON.stringify(event.metadata || {})
    ]);
    
    return result.rows[0];
  }

  static async getEvents(caseId: string): Promise<MediationEvent[]> {
    const query = 'SELECT * FROM mediation_events WHERE case_id = $1 ORDER BY created_at ASC';
    const result = await executeQuery<MediationEvent>(query, [caseId]);
    return result.rows;
  }
}

// Document operations
export class DocumentOperations {
  static async create(document: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document> {
    const query = `
      INSERT INTO documents (filename, file_type, file_size, uploaded_by, case_id, query_id, file_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await executeQuery<Document>(query, [
      document.filename,
      document.type,
      document.size,
      document.uploadedBy,
      null, // case_id - will be set when associating with cases
      null, // query_id - will be set when associating with queries
      document.url
    ]);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE id = $1';
    const result = await executeQuery<Document>(query, [id]);
    return result.rows[0] || null;
  }

  static async findByCaseId(caseId: string): Promise<Document[]> {
    const query = 'SELECT * FROM documents WHERE case_id = $1 ORDER BY created_at DESC';
    const result = await executeQuery<Document>(query, [caseId]);
    return result.rows;
  }

  static async findByQueryId(queryId: string): Promise<Document[]> {
    const query = 'SELECT * FROM documents WHERE query_id = $1 ORDER BY created_at DESC';
    const result = await executeQuery<Document>(query, [queryId]);
    return result.rows;
  }
}

// Legal Guidance operations
export class LegalGuidanceOperations {
  static async create(guidance: Omit<LegalGuidance, 'id' | 'createdAt'>): Promise<LegalGuidance> {
    const query = `
      INSERT INTO legal_guidance (
        query_id, steps, applicable_laws, cultural_considerations, 
        next_actions, confidence
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await executeQuery<LegalGuidance>(query, [
      guidance.queryId,
      JSON.stringify(guidance.steps),
      JSON.stringify(guidance.applicableLaws),
      guidance.culturalConsiderations,
      guidance.nextActions,
      guidance.confidence
    ]);
    
    return result.rows[0];
  }

  static async findByQueryId(queryId: string): Promise<LegalGuidance | null> {
    const query = 'SELECT * FROM legal_guidance WHERE query_id = $1';
    const result = await executeQuery<LegalGuidance>(query, [queryId]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<LegalGuidance | null> {
    const query = 'SELECT * FROM legal_guidance WHERE id = $1';
    const result = await executeQuery<LegalGuidance>(query, [id]);
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<LegalGuidance>): Promise<LegalGuidance | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.steps) {
      setClause.push(`steps = $${paramIndex++}`);
      values.push(JSON.stringify(updates.steps));
    }
    
    if (updates.applicableLaws) {
      setClause.push(`applicable_laws = $${paramIndex++}`);
      values.push(JSON.stringify(updates.applicableLaws));
    }

    if (updates.culturalConsiderations) {
      setClause.push(`cultural_considerations = $${paramIndex++}`);
      values.push(updates.culturalConsiderations);
    }

    if (updates.nextActions) {
      setClause.push(`next_actions = $${paramIndex++}`);
      values.push(updates.nextActions);
    }

    if (updates.confidence !== undefined) {
      setClause.push(`confidence = $${paramIndex++}`);
      values.push(updates.confidence);
    }

    if (setClause.length === 0) return null;

    values.push(id);

    const query = `
      UPDATE legal_guidance 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executeQuery<LegalGuidance>(query, values);
    return result.rows[0] || null;
  }
}

// Health check operation
export async function healthCheck(): Promise<boolean> {
  try {
    await executeQuery('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}