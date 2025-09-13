import fs from 'fs';
import path from 'path';
import pool from '../config';

interface Migration {
  id: number;
  filename: string;
  executed_at?: Date;
}

async function createMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
  return result.rows.map(row => row.filename);
}

async function executeMigration(filename: string): Promise<void> {
  const migrationPath = path.join(__dirname, filename);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration as executed
    await client.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Migration ${filename} executed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration ${filename} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Execute pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };