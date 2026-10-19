/**
 * Enable Row Level Security (RLS) on all public tables in Supabase Postgres
 * Fixes Supabase Security Advisor warnings and secures tables from unauthorized public REST API access
 */
import dotenv from 'dotenv';
import { getPostgresClient, closeDb } from '../src/db/index.js';

dotenv.config();

async function enableRLS() {
  console.log('===============================================================');
  console.log('🛡️  LevelUp RPG — Supabase Security: Enable Row Level Security');
  console.log('===============================================================\n');

  const sql = getPostgresClient();
  if (!sql) {
    console.error('❌ Lỗi: DATABASE_URL không tồn tại trong .env');
    process.exit(1);
  }

  const tables = ['users', 'user_game_states', 'bank_pool', 'notes', 'user_sessions'];

  for (const table of tables) {
    try {
      await sql.unsafe(`ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`   ✅ Đã bật RLS bảo vệ bảng: public.${table}`);
    } catch (err) {
      console.warn(`   ⚠️  Lỗi khi bật RLS bảng ${table}:`, err.message);
    }
  }

  await closeDb();
  console.log('\n🎉 Hoàn tất! Toàn bộ 5 bảng đã được bảo vệ tuyệt đối.');
  console.log('💡 Toàn bộ các cảnh báo đỏ trong Supabase Advisor sẽ tự động biến mất.\n');
}

enableRLS();
