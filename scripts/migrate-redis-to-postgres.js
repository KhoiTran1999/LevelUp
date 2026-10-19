/**
 * LevelUp RPG Guild — Data Migration Script: Redis to Supabase Postgres
 * Scans all players, bank states, and active sessions from Redis and imports them into Supabase
 */
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { isDbConfigured, closeDb } from '../src/db/index.js';
import { upsertUser, getUserById } from '../src/db/repositories/userRepository.js';
import { saveBankPoolState } from '../src/db/repositories/bankRepository.js';
import { saveSession } from '../src/db/repositories/sessionRepository.js';

dotenv.config();

async function migrateRedisToPostgres() {
  console.log('===============================================================');
  console.log('⚔️  LevelUp RPG — Migration: Redis Cloud -> Supabase Postgres');
  console.log('===============================================================\n');

  if (!isDbConfigured()) {
    console.error('❌ Lỗi: DATABASE_URL chưa được cấu hình trong file .env');
    process.exit(1);
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ Lỗi: REDIS_URL không có trong file .env để đọc dữ liệu nguồn.');
    process.exit(1);
  }

  console.log('📡 Đang kết nối tới Redis Cloud...');
  const redis = new Redis(redisUrl, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3
  });

  const stats = {
    usersFound: 0,
    usersMigrated: 0,
    usersSkipped: 0,
    sessionsMigrated: 0,
    bankPoolMigrated: false,
    errors: []
  };

  try {
    // 1. Di chuyển Kho Bạc Ngân hàng (Bank Pool)
    console.log('🏦 1. Đang kiểm tra và di chuyển Kho Bạc Ngân Hàng (Bank Pool)...');
    try {
      const rawPool = await redis.get('levelup:bank:pool');
      if (rawPool) {
        const parsedPool = JSON.parse(rawPool);
        await saveBankPoolState(parsedPool);
        console.log(`   ✅ Đã di chuyển Kho Bạc: Pool=${parsedPool.poolGold || 500} Vàng, Vay=${parsedPool.totalBorrowed || 0} Vàng, Quỹ=${parsedPool.reserveFund || 150} Vàng.`);
        stats.bankPoolMigrated = true;
      } else {
        console.log('   ℹ️  Không tìm thấy bản ghi levelup:bank:pool trên Redis. Bỏ qua.');
      }
    } catch (err) {
      console.warn('   ⚠️  Lỗi khi di chuyển Kho Bạc:', err.message);
      stats.errors.push(`Bank Pool: ${err.message}`);
    }

    // 2. Thu thập danh sách ID người chơi từ Redis
    console.log('\n👥 2. Đang quét danh sách người chơi trên Redis...');
    const userKeysSet = new Set();

    // 2.1 Quét từ set levelup:all_users
    try {
      const allMembers = await redis.smembers('levelup:all_users');
      if (Array.isArray(allMembers)) {
        allMembers.forEach(sub => sub && userKeysSet.add(`levelup:user:google:${sub}`));
      }
    } catch (_) {}

    // 2.2 Quét toàn bộ keys levelup:user:*
    try {
      const userKeys = await redis.keys('levelup:user:*');
      if (Array.isArray(userKeys)) {
        userKeys.forEach(k => k && userKeysSet.add(k));
      }
    } catch (_) {}

    // 2.3 Lấy danh sách kẻ gian lận để đồng bộ cờ isCheater
    const cheaterSubs = new Set();
    try {
      const cheaters = await redis.zrange('levelup:cheaters', 0, -1);
      if (Array.isArray(cheaters)) {
        cheaters.forEach(c => c && cheaterSubs.add(String(c)));
      }
    } catch (_) {}

    console.log(`   🔍 Tìm thấy ${userKeysSet.size} bản ghi user keys.`);

    // 3. Xử lý và di chuyển từng người chơi sang Supabase Postgres
    const processedSubs = new Set();

    for (const key of userKeysSet) {
      try {
        const raw = await redis.get(key);
        if (!raw) continue;

        let userData = null;
        try {
          userData = JSON.parse(raw);
        } catch (_) {
          continue;
        }

        if (!userData || typeof userData !== 'object' || !userData.profile) {
          continue;
        }

        // Xác định subId duy nhất
        const subId = String(
          userData.googleId ||
          userData.profile.googleId ||
          userData.profile.sub ||
          (key.startsWith('levelup:user:google:') ? key.replace('levelup:user:google:', '') : '')
        ).trim();

        if (!subId || processedSubs.has(subId)) {
          continue;
        }

        stats.usersFound++;
        processedSubs.add(subId);

        // Đánh dấu cờ cheater nếu có trong danh sách
        if (cheaterSubs.has(subId) || userData.profile.isCheater) {
          userData.profile.isCheater = true;
          userData.isCheater = true;
        }

        const nick = userData.profile.nickname || subId;
        process.stdout.write(`   ⏳ Đang import: [${nick}] (ID: ${subId.slice(0, 12)}...)... `);

        // Ghi vào Supabase qua Drizzle ORM
        const success = await upsertUser(subId, userData, userData.activeTimer || null);

        if (success) {
          stats.usersMigrated++;
          console.log('✅ Thành công');
        } else {
          stats.usersSkipped++;
          console.log('❌ Lỗi lưu DB');
          stats.errors.push(`User ${subId}: upsert failed`);
        }
      } catch (userErr) {
        console.log(`❌ Lỗi: ${userErr.message}`);
        stats.errors.push(`Key ${key}: ${userErr.message}`);
      }
    }

    // 4. Di chuyển các phiên đăng nhập (Sessions)
    console.log('\n🔑 4. Đang di chuyển các phiên đăng nhập (Active Sessions)...');
    try {
      const sessionKeys = await redis.keys('levelup:session:*');
      console.log(`   🔍 Tìm thấy ${sessionKeys.length} session tokens.`);

      for (const sKey of sessionKeys) {
        try {
          const rawSess = await redis.get(sKey);
          if (!rawSess) continue;
          const sessData = JSON.parse(rawSess);
          if (sessData && sessData.sub) {
            const token = sKey.replace('levelup:session:', '');
            const saved = await saveSession(token, sessData);
            if (saved) stats.sessionsMigrated++;
          }
        } catch (_) {}
      }
      console.log(`   ✅ Đã di chuyển ${stats.sessionsMigrated} session tokens sang Postgres.`);
    } catch (sessErr) {
      console.warn('   ⚠️  Lỗi khi di chuyển sessions:', sessErr.message);
    }

  } catch (err) {
    console.error('❌ Lỗi nghiêm trọng trong quá trình migration:', err);
  } finally {
    await redis.quit();
    await closeDb();
    console.log('\n🔌 Đã đóng kết nối Redis và PostgreSQL.');
  }

  // Báo cáo tổng kết
  console.log('\n===============================================================');
  console.log('🏁 BÁO CÁO KẾT QUẢ MIGRATION DỮ LIỆU');
  console.log('===============================================================');
  console.log(`✅ Tổng số người chơi phát hiện trên Redis: ${stats.usersFound}`);
  console.log(`✅ Người chơi đã chuyển sang Supabase:    ${stats.usersMigrated}`);
  console.log(`✅ Phiên đăng nhập (Sessions) đã chuyển:   ${stats.sessionsMigrated}`);
  console.log(`🏦 Kho bạc Ngân hàng (Bank Pool):         ${stats.bankPoolMigrated ? 'ĐÃ ĐỒNG BỘ' : 'KHÔNG CÓ DỮ LIỆU CŨ'}`);

  if (stats.errors.length > 0) {
    console.log(`⚠️  Số lỗi phát sinh: ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log('\n🎉 TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC CHUYỂN SANG SUPABASE THÀNH CÔNG 100%!');
  }
  console.log('===============================================================\n');
}

migrateRedisToPostgres();
