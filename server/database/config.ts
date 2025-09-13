import { Pool } from 'pg';
import { DatabaseConfig } from '../types';

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jurisguide',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production'
};

export const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.username,
  password: config.password,
  ssl: config.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await pool.end();
  console.log('Disconnected from PostgreSQL database');
};

export default pool;