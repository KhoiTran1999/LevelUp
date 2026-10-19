/**
 * LevelUp RPG Guild — Database Client Factory
 * Powered by Drizzle ORM and Postgres.js
 * Compatible with Supabase Transaction Pooler (Port 6543) and Direct connections
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

let dbInstance = null;
let sqlClientInstance = null;
let dbClientForTesting = null;

/**
 * Returns true if a PostgreSQL database connection string is provided in environment variables
 */
export function isDbConfigured() {
  if (dbClientForTesting) return true;
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_REAL_DB) {
    return false;
  }
  const url = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL;
  return Boolean(url && url.trim().length > 0);
}

/**
 * Get connection string from environment
 */
export function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();
}

/**
 * Test hook for mocking DB in automated hermetic tests without network
 */
export function setDbClientForTesting(client) {
  dbClientForTesting = client;
}

/**
 * Initialize or retrieve the singleton Postgres.js client
 */
export function getPostgresClient() {
  if (dbClientForTesting) {
    return dbClientForTesting.client || null;
  }
  if (!isDbConfigured()) {
    return null;
  }

  if (!sqlClientInstance) {
    const connectionString = getConnectionString();
    
    // Check if the connection uses Supabase Transaction Pooler (port 6543 or pgbouncer)
    const isPooler = connectionString.includes(':6543') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('pgbouncer=true') ||
      connectionString.includes('-pooler');

    sqlClientInstance = postgres(connectionString, {
      prepare: !isPooler, // CRITICAL: Transaction poolers do not support named prepared statements
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sqlClientInstance;
}

/**
 * Initialize or retrieve the singleton Drizzle ORM instance
 */
export function getDb() {
  if (dbClientForTesting) {
    return dbClientForTesting;
  }
  if (!isDbConfigured()) {
    return null;
  }

  if (!dbInstance) {
    const client = getPostgresClient();
    if (!client) return null;
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

/**
 * Gracefully close PostgreSQL client connections
 */
export async function closeDb() {
  if (sqlClientInstance) {
    try {
      await sqlClientInstance.end({ timeout: 5 });
    } catch (_) {}
    sqlClientInstance = null;
    dbInstance = null;
  }
}

export { schema };
export default getDb;
