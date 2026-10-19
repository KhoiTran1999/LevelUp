/**
 * Database Migration Runner for Drizzle ORM
 * Applies generated SQL migrations to Supabase/Postgres
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb, isDbConfigured, closeDb } from '../src/db/index.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

async function runMigration() {
  if (!isDbConfigured()) {
    console.error('❌ Error: DATABASE_URL is not configured in .env');
    console.log('👉 Please set DATABASE_URL in your .env file with your Supabase Postgres connection string.');
    process.exit(1);
  }

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  if (!fs.existsSync(migrationsFolder)) {
    console.log('⚠️ No migrations directory found at "./drizzle".');
    console.log('👉 Please run "npm run db:generate" first to generate SQL migration files from src/db/schema.js.');
    process.exit(0);
  }

  console.log('⏳ Running database migrations with Drizzle ORM...');
  const db = getDb();
  try {
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

runMigration();
