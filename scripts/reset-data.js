import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

async function resetAllData() {
  console.log('====================================================');
  console.log('⚔️  LevelUp RPG — Reset Toàn Bộ Dữ Liệu Về Mặc Định');
  console.log('====================================================\n');

  // 1. Reset Redis
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL không được cấu hình trong .env. Bỏ qua bước xóa Redis.');
  } else {
    console.log('📡 Đang kết nối tới Redis Cloud...');
    const redis = new Redis(redisUrl, { connectTimeout: 10000 });

    try {
      const allLevelupKeys = await redis.keys('levelup:*');
      console.log(`🔍 Tìm thấy ${allLevelupKeys.length} khóa thuộc namespace "levelup:*".`);

      // Bảo vệ tuyệt đối: Chỉ xóa những khóa bắt đầu bằng "levelup:"
      const safeKeysToDelete = allLevelupKeys.filter(k => k.startsWith('levelup:'));

      if (safeKeysToDelete.length > 0) {
        console.log(`🗑️  Đang xóa ${safeKeysToDelete.length} khóa LevelUp...`);
        // Xóa theo batch
        for (let i = 0; i < safeKeysToDelete.length; i += 50) {
          const batch = safeKeysToDelete.slice(i, i + 50);
          await redis.del(...batch);
        }
        console.log('✅ Đã xóa sạch toàn bộ khóa dữ liệu cũ trên Redis.');
      } else {
        console.log('ℹ️  Không có khóa LevelUp nào cần xóa.');
      }

      // Khởi tạo lại trạng thái Ngân hàng Guild mặc định
      const defaultBank = {
        poolGold: 500, // Kho bạc bảo chứng ban đầu
        totalBorrowed: 0,
        reserveFund: 150, // Quỹ dự phòng ban đầu
        totalDeposited: 0,
        bailoutDebt: 0, // Nợ cứu trợ kho bạc
        lastAccruedAt: Date.now()
      };
      await redis.set('levelup:bank:pool', JSON.stringify(defaultBank));
      console.log('🏦 Đã khởi tạo lại Ngân hàng Guild về mặc định (Pool: 500 Vàng, Quỹ dự phòng: 150 Vàng).');

    } catch (err) {
      console.error('❌ Lỗi khi xử lý Redis:', err.message);
    } finally {
      await redis.quit();
      console.log('🔌 Đã đóng kết nối Redis.\n');
    }
  }

  // 2. Reset Cloud Storage (Supabase Storage)
  const supabaseUrlRaw = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET_NAME || 'proofs levelup';

  if (!supabaseUrlRaw || !supabaseKey) {
    console.log('ℹ️  Supabase Storage không được cấu hình. Bỏ qua bước xóa ảnh.');
  } else {
    console.log('☁️  Đang kiểm tra Cloud Storage (Supabase Storage)...');
    const supabaseUrl = supabaseUrlRaw.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    try {
      async function listAllFiles(prefix = '') {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prefix, limit: 100 })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Không thể lấy danh sách file (${res.status}): ${text}`);
        }
        const items = await res.json();
        let files = [];
        for (const item of items) {
          if (item.id) {
            files.push((prefix ? `${prefix}/` : '') + item.name);
          } else {
            const subFiles = await listAllFiles((prefix ? `${prefix}/` : '') + item.name);
            files = files.concat(subFiles);
          }
        }
        return files;
      }

      const filesToDelete = await listAllFiles();
      console.log(`🖼️  Tìm thấy ${filesToDelete.length} ảnh bằng chứng cũ trong bucket "${bucket}".`);

      if (filesToDelete.length > 0) {
        console.log(`🗑️  Đang xóa ${filesToDelete.length} ảnh bằng chứng...`);
        const delRes = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prefixes: filesToDelete })
        });

        if (delRes.ok) {
          console.log('✅ Đã xóa sạch toàn bộ ảnh bằng chứng cũ trên Cloud Storage.');
        } else {
          const errText = await delRes.text().catch(() => '');
          console.warn(`⚠️  Xóa ảnh trả về trạng thái ${delRes.status}:`, errText);
        }
      } else {
        console.log('ℹ️  Bucket ảnh hiện đang trống.');
      }
    } catch (err) {
      console.error('❌ Lỗi khi xử lý Cloud Storage:', err.message);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 RESET HOÀN TẤT: Dữ liệu đã sẵn sàng để sử dụng như mới!');
  console.log('💡 Lưu ý: Trình duyệt của bạn có thể bấm F5 hoặc xóa dữ liệu trang web để bắt đầu trải nghiệm mới.');
  console.log('====================================================');
}

resetAllData();
