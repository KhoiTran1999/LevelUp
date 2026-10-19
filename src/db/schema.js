/**
 * LevelUp RPG Guild — Database Schema definitions powered by Drizzle ORM
 * Optimized for Supabase & Neon PostgreSQL with Hybrid Relational + Document Architecture
 * All tables have Row Level Security (RLS) enabled to satisfy Supabase Security Advisor
 */
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * 1. Users Table
 * Normalized user profile for lightning-fast leaderboard, authentication, and admin inspection
 */
export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(), // Google Sub ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  nickname: varchar('nickname', { length: 64 }).unique(),
  name: varchar('name', { length: 255 }),
  avatar: text('avatar'),
  role: varchar('role', { length: 32 }).default('adventurer'),
  title: varchar('title', { length: 128 }).default('Tân Binh Cấp 1'),
  level: integer('level').default(1),
  exp: integer('exp').default(0),
  coins: integer('coins').default(20),
  totalCoinsEarned: integer('total_coins_earned').default(20),
  totalCoinsSpent: integer('total_coins_spent').default(0),
  streak: integer('streak').default(0),
  netWorth: integer('net_worth').default(20),
  isCheater: boolean('is_cheater').default(false),
  lastOnlineAt: timestamp('last_online_at', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_users_coins').on(table.coins),
  index('idx_users_net_worth').on(table.netWorth),
  index('idx_users_nickname').on(table.nickname),
  index('idx_users_email').on(table.email),
  index('idx_users_cheater').on(table.isCheater)
]).enableRLS();

/**
 * 2. User Game States Table
 * Preserves the full rich RPG state tree (Quests, Inventory, AMM Bank terms, Ledger, Proofs)
 */
export const userGameStates = pgTable('user_game_states', {
  userId: varchar('user_id', { length: 128 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  state: jsonb('state').notNull(),
  activeTimer: jsonb('active_timer'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastModified: timestamp('last_modified', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}).enableRLS();

/**
 * 3. Bank Pool Table (AMM Liquidity Pool & Central Treasury)
 * Singleton row storing macro-economic reserves, loans, and system liquidity
 */
export const bankPool = pgTable('bank_pool', {
  id: integer('id').primaryKey().default(1),
  poolGold: integer('pool_gold').default(500),
  totalBorrowed: integer('total_borrowed').default(0),
  reserveFund: integer('reserve_fund').default(150),
  totalDeposited: integer('total_deposited').default(0),
  bailoutDebt: integer('bailout_debt').default(0),
  lastAccruedAt: timestamp('last_accrued_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}).enableRLS();

/**
 * 4. Notes Table
 * Standalone relational table for rapid search, categorizing, and mobile sync
 */
export const notes = pgTable('notes', {
  id: varchar('id', { length: 128 }).primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').default(''),
  category: varchar('category', { length: 64 }).default('general'),
  isPinned: boolean('is_pinned').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_notes_user').on(table.userId),
  index('idx_notes_category').on(table.category)
]).enableRLS();

/**
 * 5. User Sessions Table
 * Stores verified Google login sessions with expiration
 */
export const userSessions = pgTable('user_sessions', {
  token: varchar('token', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  picture: text('picture'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_sessions_user').on(table.userId),
  index('idx_sessions_expires').on(table.expiresAt)
]).enableRLS();
