import { Pool } from 'pg';
import pool from '../database/config';
import { Lawyer, LawyerProfile, MatchingCriteria, Rating, LegalCategory } from '../types';
import { logger } from '../utils/logger';

export class LawyerService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  async registerLawyer(lawyerData: Omit<Lawyer, 'id' | 'ratings' | 'verificationStatus' | 'createdAt' | 'updatedAt'>): Promise<Lawyer> {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO lawyers (profile, specializations, location, availability, pricing, verification_status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id, profile, specializations, location, availability, pricing, verification_status, created_at, updated_at
      `;

      const values = [
        JSON.stringify(lawyerData.profile),
        lawyerData.specializations,
        JSON.stringify(lawyerData.location),
        JSON.stringify(lawyerData.availability),
        JSON.stringify(lawyerData.pricing)
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      return {
        id: row.id,
        profile: row.profile,
        specializations: row.specializations,
        location: row.location,
        availability: row.availability,
        pricing: row.pricing,
        ratings: [],
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      client.release();
    }
  }

  async getLawyerById(id: string): Promise<Lawyer | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT l.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'userId', lr.user_id,
                     'score', lr.score,
                     'review', lr.review,
                     'createdAt', lr.created_at
                   )
                 ) FILTER (WHERE lr.id IS NOT NULL), 
                 '[]'
               ) as ratings
        FROM lawyers l
        LEFT JOIN lawyer_ratings lr ON l.id = lr.lawyer_id
        WHERE l.id = $1
        GROUP BY l.id
      `;

      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        profile: row.profile,
        specializations: row.specializations,
        location: row.location,
        availability: row.availability,
        pricing: row.pricing,
        ratings: row.ratings,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      client.release();
    }
  }

  async updateLawyer(id: string, updates: Partial<Lawyer>): Promise<Lawyer | null> {
    const client = await this.db.connect();
    
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.profile) {
        setClauses.push(`profile = $${paramIndex}`);
        values.push(JSON.stringify(updates.profile));
        paramIndex++;
      }

      if (updates.specializations) {
        setClauses.push(`specializations = $${paramIndex}`);
        values.push(updates.specializations);
        paramIndex++;
      }

      if (updates.location) {
        setClauses.push(`location = $${paramIndex}`);
        values.push(JSON.stringify(updates.location));
        paramIndex++;
      }

      if (updates.availability) {
        setClauses.push(`availability = $${paramIndex}`);
        values.push(JSON.stringify(updates.availability));
        paramIndex++;
      }

      if (updates.pricing) {
        setClauses.push(`pricing = $${paramIndex}`);
        values.push(JSON.stringify(updates.pricing));
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return this.getLawyerById(id);
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE lawyers 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.getLawyerById(id);
    } finally {
      client.release();
    }
  }

  async searchLawyers(criteria: MatchingCriteria): Promise<Lawyer[]> {
    const client = await this.db.connect();
    
    try {
      // Build dynamic query based on criteria
      let query = `
        SELECT l.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'userId', lr.user_id,
                     'score', lr.score,
                     'review', lr.review,
                     'createdAt', lr.created_at
                   )
                 ) FILTER (WHERE lr.id IS NOT NULL), 
                 '[]'
               ) as ratings,
               COALESCE(AVG(lr.score), 0) as avg_rating,
               -- Calculate distance using Haversine formula
               (
                 6371 * acos(
                   cos(radians($1)) * cos(radians((l.location->>'latitude')::float)) *
                   cos(radians((l.location->>'longitude')::float) - radians($2)) +
                   sin(radians($1)) * sin(radians((l.location->>'latitude')::float))
                 )
               ) as distance_km
        FROM lawyers l
        LEFT JOIN lawyer_ratings lr ON l.id = lr.lawyer_id
        WHERE l.verification_status = 'verified'
          AND $3 = ANY(l.specializations)
          AND (l.pricing->>'hourlyRate')::float <= $4
          AND (l.pricing->>'consultationFee')::float <= $5
      `;

      const values: any[] = [
        criteria.location.latitude,
        criteria.location.longitude,
        criteria.caseType,
        criteria.budget.max,
        criteria.budget.max // Using max budget for consultation fee filter too
      ];

      let paramIndex = values.length + 1;
      
      // Add language filter if specified
      if (criteria.languagePreference) {
        query += ` AND $${paramIndex} = ANY((l.profile->>'languages')::text[])`;
        values.push(criteria.languagePreference);
        paramIndex++;
      }

      query += `
        GROUP BY l.id
        ORDER BY 
          CASE WHEN $${paramIndex} = 'critical' THEN 1
               WHEN $${paramIndex} = 'high' THEN 2
               WHEN $${paramIndex} = 'medium' THEN 3
               ELSE 4 END,
          avg_rating DESC,
          distance_km ASC
        LIMIT 20
      `;

      values.push(criteria.urgency);

      const result = await client.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        profile: row.profile,
        specializations: row.specializations,
        location: row.location,
        availability: row.availability,
        pricing: row.pricing,
        ratings: row.ratings,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      client.release();
    }
  }

  async getLawyersBySpecialization(category: string): Promise<Lawyer[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT l.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'userId', lr.user_id,
                     'score', lr.score,
                     'review', lr.review,
                     'createdAt', lr.created_at
                   )
                 ) FILTER (WHERE lr.id IS NOT NULL), 
                 '[]'
               ) as ratings,
               COALESCE(AVG(lr.score), 0) as avg_rating
        FROM lawyers l
        LEFT JOIN lawyer_ratings lr ON l.id = lr.lawyer_id
        WHERE l.verification_status = 'verified'
          AND $1 = ANY(l.specializations)
        GROUP BY l.id
        ORDER BY avg_rating DESC, l.created_at DESC
        LIMIT 50
      `;

      const result = await client.query(query, [category]);

      return result.rows.map(row => ({
        id: row.id,
        profile: row.profile,
        specializations: row.specializations,
        location: row.location,
        availability: row.availability,
        pricing: row.pricing,
        ratings: row.ratings,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      client.release();
    }
  }

  async updateVerificationStatus(id: string, status: 'verified' | 'pending' | 'unverified'): Promise<Lawyer | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE lawyers 
        SET verification_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id
      `;

      const result = await client.query(query, [status, id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.getLawyerById(id);
    } finally {
      client.release();
    }
  }

  async addRating(lawyerId: string, userId: string, score: number, review?: string): Promise<Rating> {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO lawyer_ratings (lawyer_id, user_id, score, review)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (lawyer_id, user_id) 
        DO UPDATE SET score = $3, review = $4, created_at = CURRENT_TIMESTAMP
        RETURNING user_id, score, review, created_at
      `;

      const result = await client.query(query, [lawyerId, userId, score, review]);
      const row = result.rows[0];

      return {
        userId: row.user_id,
        score: row.score,
        review: row.review,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  async getLawyerRatings(lawyerId: string): Promise<Rating[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT user_id, score, review, created_at
        FROM lawyer_ratings
        WHERE lawyer_id = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [lawyerId]);

      return result.rows.map(row => ({
        userId: row.user_id,
        score: row.score,
        review: row.review,
        createdAt: row.created_at
      }));
    } finally {
      client.release();
    }
  }

  async getAverageRating(lawyerId: string): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT COALESCE(AVG(score), 0) as avg_rating
        FROM lawyer_ratings
        WHERE lawyer_id = $1
      `;

      const result = await client.query(query, [lawyerId]);
      return parseFloat(result.rows[0].avg_rating);
    } finally {
      client.release();
    }
  }
}