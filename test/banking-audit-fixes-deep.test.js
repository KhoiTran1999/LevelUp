import assert from 'node:assert';
import handler, {
  calculateBankRates,
  calculateCreditLimit,
  calculateNetWorth,
  accrueUserBank,
  deriveLegitimateBalance,
  reconcileGlobalBankPool,
  setRedisClientForTesting
} from '../api/sync.js';
import { handleGetMyUserData } from '../api/ai.js';

console.log('=== Bắt đầu kiểm thử Toàn Diện Các Bản Vá Lỗi & Logic Ngân Hàng (Banking Deep Audit Fixes) ===\n');

// 1. Kiểm thử Hàm calculateNetWorth (Leaderboard Điểm Chuẩn)
{
  // Kịch bản A: Người chơi có 100 Vàng trong ví, chưa dùng ngân hàng
  const userA = { coins: 100, bank: null };
  assert.strictEqual(calculateNetWorth(userA), 100, 'Tài sản ròng khi chưa dùng ngân hàng là 100');

  // Kịch bản B: Người chơi đem gửi 60 Vàng vào sổ tiết kiệm (ví còn 40)
  const userB = { coins: 40, bank: { deposited: 60, depositInterest: 5, loan: null } };
  assert.strictEqual(calculateNetWorth(userB), 105, 'Tài sản ròng khi gửi tiết kiệm phải là 40 + 60 + 5 = 105 Vàng (không bị tụt hạng BXH!)');

  // Kịch bản C: Người chơi vay 80 Vàng (ví có 180, nợ 80)
  const userC = { coins: 180, bank: { deposited: 0, loan: { principal: 80, debt: 80 } } };
  assert.strictEqual(calculateNetWorth(userC), 100, 'Tài sản ròng khi vay tiền là 180 - 80 = 100 Vàng (không thể dùng tiền đi vay để gian lận top BXH!)');

  // Kịch bản D: Người chơi để nợ sinh lãi lên 90 Vàng
  const userD = { coins: 180, bank: { deposited: 0, loan: { principal: 80, debt: 90 } } };
  assert.strictEqual(calculateNetWorth(userD), 90, 'Tài sản ròng giảm xuống 90 do nợ lãi');

  console.log('✓ Test 1: calculateNetWorth chuẩn hóa chính xác tài sản ròng, chấm dứt triệt để lỗi thao túng Bảng Xếp Hạng.');
}

// 2. Kiểm thử Anti-Cheat Regex Ledger Chống Bơm Vàng Lãi Khống
{
  // Kẻ gian tạo ledger entry với description '999999 lãi' nhưng amount chỉ có 5 Vàng
  const tamperedLedgerState = {
    profile: {
      coins: 25,
      totalCoinsEarned: 25
    },
    quests: [],
    inventory: [],
    ledger: [
      {
        id: 'hack_withdraw',
        type: 'earn',
        category: 'bank_withdraw',
        amount: 5,
        description: '🏦 Đã rút 5 Vàng (0 gốc + 999999 lãi) từ Ngân Hàng'
      }
    ]
  };

  const check = deriveLegitimateBalance(tamperedLedgerState);
  // questEarned = 20 (base floor). Lãi rút được trần tối đa là Math.min(amount=5, 999999) = 5 Vàng.
  // maxTrackedEarned = 20 + 5 = 25 Vàng.
  assert.strictEqual(check.coins, 25, 'Số Vàng ví hợp lệ tối đa được bảo vệ ở mức 25 Vàng');

  // Thử can thiệp số coin lên 999999 dựa vào regex cũ
  const inflatedState = {
    ...tamperedLedgerState,
    profile: {
      ...tamperedLedgerState.profile,
      coins: 999999
    }
  };
  const checkInflated = deriveLegitimateBalance(inflatedState);
  assert.strictEqual(checkInflated.tampered, true, 'Anti-Cheat phải bắt quả tang và phạt gian lận ngay lập tức!');
  assert.strictEqual(checkInflated.coins, 0, 'Phạt trừ toàn bộ Vàng về 0');

  console.log('✓ Test 2: Chặn đứng 100% lỗ hổng khai thác regex mô tả sổ cái để vượt rào Anti-Cheat.');
}

// 3. Kiểm thử Reconcile Global Bank Pool Không Bơm Tiền Ảo Khi Nợ Bị Xóa
{
  const mockStorage = new Map();
  const mockRedis = {
    get: async (k) => mockStorage.get(k) || null,
    set: async (k, v) => mockStorage.set(k, v),
    smembers: async (k) => ['user_deleted_1'],
    keys: async (k) => []
  };

  // Trạng thái Bể AMM: Đang ghi nhận totalBorrowed = 100, poolGold = 500
  const poolState = {
    poolGold: 500,
    totalBorrowed: 100,
    totalDeposited: 0,
    reserveFund: 150,
    bailoutDebt: 0
  };

  // Người dùng user_deleted_1 không còn tồn tại trong DB (hoặc nợ đã bị admin hủy)
  // totalRealBorrowed quét được = 0
  const reconciled = await reconcileGlobalBankPool(mockRedis, poolState);

  assert.strictEqual(reconciled.totalBorrowed, 0, 'totalBorrowed cập nhật chính xác về 0');
  assert.strictEqual(reconciled.poolGold, 500, 'poolGold TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐỘNG TĂNG LÊN 600 khi nợ xấu bị xóa sổ!');

  console.log('✓ Test 3: Đối soát Bể AMM reconcileGlobalBankPool không sinh tiền ảo khi tài khoản nợ biến mất.');
}

// 4. Kiểm thử Bảo Toàn Dòng Tiền & Thứ Tự Khấu Trừ Nợ Trong bank_repay (Zero Gold Duplication)
{
  const mockStorage = new Map();
  const mockRedis = {
    get: async (k) => mockStorage.get(k) || null,
    set: async (k, v) => mockStorage.set(k, v),
    del: async (k) => mockStorage.delete(k)
  };
  setRedisClientForTesting(mockRedis);

  const token = 'token_repay_conservation_test';
  const sub = `sub_${token}`;
  const userKey = `levelup:user:google:${sub}`;

  // Hồ sơ: Ví có 200 Vàng, Khoản vay: Gốc 100 Vàng, Dư nợ 120 Vàng (20 Vàng lãi phát sinh)
  const initialUserState = {
    profile: {
      googleId: sub,
      nickname: 'Repayer',
      coins: 200,
      totalCoinsEarned: 200,
      level: 3,
      bank: {
        deposited: 0,
        depositInterest: 0,
        loan: {
          principal: 100,
          debt: 120,
          borrowRate: 0.05,
          autoDeductPercent: 0.5,
          borrowedAt: Date.now() - (2 * 24 * 3600 * 1000),
          lastAccruedAt: Date.now(),
          isOverdue: false
        }
      }
    },
    ledger: []
  };
  mockStorage.set(userKey, JSON.stringify(initialUserState));
  mockStorage.set(`levelup:session:${token}`, JSON.stringify({ sub, email: 'repayer@test.com' }));

  // Trạng thái Bể AMM: poolGold = 300, totalBorrowed = 100, reserveFund = 100, bailoutDebt = 0
  const initialPool = {
    poolGold: 300,
    totalBorrowed: 100,
    totalDeposited: 0,
    reserveFund: 100,
    bailoutDebt: 0
  };
  mockStorage.set('levelup:bank:pool', JSON.stringify(initialPool));

  // Người dùng tất toán toàn bộ 120 Vàng nợ trước hạn (phí phạt 5% = 6 Vàng)
  // Tổng tiền trả totalPaid = 120 + 6 = 126 Vàng
  const req = {
    method: 'POST',
    query: { action: 'bank_repay' },
    headers: { authorization: `Bearer ${token}` },
    body: { amount: 120 }
  };

  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        responseData = data;
        return data;
      }
    })
  };

  await handler(req, res);

  assert.strictEqual(responseData.success, true, 'Trả nợ thành công');
  // Số Vàng ví giảm đúng 126
  assert.strictEqual(responseData.coins, 200 - 126, 'Ví còn lại 74 Vàng (200 - 126)');

  // Kiểm tra phân bổ dòng tiền trong Pool:
  // - principalPaid = 100 (khấu trừ hết gốc)
  // - interestPaid = 20 (lãi)
  // - penaltyFee = 6 (phạt)
  // - goldToPool = principalPaid = 100 -> poolGold mới = 300 + 100 = 400
  // - goldToReserve = interestPaid (20) + penaltyFee (6) = 26 -> reserveFund mới = 100 + 26 = 126
  // Tổng tiền nạp vào hệ thống = 100 + 26 = 126 Vàng (ĐÚNG BẰNG 126 VÀNG NGƯỜI DÙNG ĐÃ TRẢ!)
  const finalPool = JSON.parse(mockStorage.get('levelup:bank:pool'));
  assert.strictEqual(finalPool.poolGold, 400, 'poolGold nhận đúng 100 Vàng vốn gốc hoàn trả');
  assert.strictEqual(finalPool.reserveFund, 126, 'reserveFund nhận đúng 26 Vàng lợi nhuận ròng (20 lãi + 6 phạt)');
  assert.strictEqual(finalPool.totalBorrowed, 0, 'Dư nợ hệ thống đã về 0');

  const totalAddedToSystem = (finalPool.poolGold - initialPool.poolGold) + (finalPool.reserveFund - initialPool.reserveFund);
  assert.strictEqual(totalAddedToSystem, 126, 'BẢO TOÀN NĂNG LƯỢNG TUYỆT ĐỐI: 126 Vàng trả = 126 Vàng vào Ngân Hàng, không sinh thêm 1 đồng tiền ảo nào!');

  console.log('✓ Test 4: Cơ chế bank_repay bảo toàn dòng tiền chuẩn xác, trừ lãi trước gốc và phân bổ lợi nhuận ròng minh bạch.');
}

// 5. Kiểm thử Bảo Toàn Chu Kỳ Sinh Lãi Khi Rút Một Phần Tiền Gửi (bank_withdraw)
{
  const mockStorage = new Map();
  const mockRedis = {
    get: async (k) => mockStorage.get(k) || null,
    set: async (k, v) => mockStorage.set(k, v),
    del: async (k) => mockStorage.delete(k)
  };
  setRedisClientForTesting(mockRedis);

  const token = 'token_withdraw_preserve_time_test';
  const sub = `sub_${token}`;
  const userKey = `levelup:user:google:${sub}`;
  const pastTimestamp = Date.now() - (10 * 60 * 1000); // Đã gửi được 10 phút trước (chưa qua 1 ngày, chưa sinh thêm lãi)

  const userWithDeposit = {
    profile: {
      googleId: sub,
      nickname: 'SaverTimelock',
      coins: 50,
      totalCoinsEarned: 50,
      level: 2,
      bank: {
        deposited: 1000,
        depositInterest: 20, // Có sẵn 20 Vàng lãi
        lastDepositAt: pastTimestamp,
        loan: null
      }
    },
    ledger: []
  };
  mockStorage.set(userKey, JSON.stringify(userWithDeposit));
  mockStorage.set(`levelup:session:${token}`, JSON.stringify({ sub, email: 'saver@test.com' }));
  mockStorage.set('levelup:bank:pool', JSON.stringify({ poolGold: 1000, totalBorrowed: 0, reserveFund: 100, bailoutDebt: 0 }));

  // Người dùng chỉ rút 10 Vàng tiền lãi (nhỏ hơn 20 Vàng lãi khả dụng, principalWithdrawn = 0)
  const req = {
    method: 'POST',
    query: { action: 'bank_withdraw' },
    headers: { authorization: `Bearer ${token}` },
    body: { amount: 10 }
  };

  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        responseData = data;
        return data;
      }
    })
  };

  await handler(req, res);

  assert.strictEqual(responseData.success, true);
  assert.strictEqual(responseData.userBank.depositInterest, 10, 'Tiền lãi còn lại là 10 Vàng');
  assert.strictEqual(responseData.userBank.deposited, 1000, 'Gốc 1000 Vàng giữ nguyên 100%');
  // Điểm mấu chốt: lastDepositAt không bị reset về Date.now()!
  assert.strictEqual(responseData.userBank.lastDepositAt, pastTimestamp, 'lastDepositAt được bảo toàn nguyên vẹn 23 giờ đã tích lũy!');

  console.log('✓ Test 5: Rút tiền lãi một phần bảo toàn 100% thời gian tích lũy cho vốn gốc còn lại.');
}

// 6. Kiểm thử AI Governor Tool Calling Tương Thích Hoàn Hảo (amount, principal, debt)
{
  const mockStorage = new Map();
  const sub = 'sub_ai_compat_test';
  mockStorage.set(`levelup:user:google:${sub}`, JSON.stringify({
    profile: { nickname: 'AIClient', coins: 120 },
    bank: {
      deposited: 300,
      depositInterest: 15,
      loan: {
        principal: 150,
        debt: 165,
        borrowRate: 0.05,
        autoDeductPercent: 0.50,
        isOverdue: false
      }
    }
  }));
  const mockRedis = { get: async (k) => mockStorage.get(k) || null };

  const result = await handleGetMyUserData('bank_and_debt', sub, mockRedis);
  assert.strictEqual(result.coins, 120);
  assert.strictEqual(result.deposited, 300);
  assert.strictEqual(result.depositInterest, 15);
  assert.ok(result.loan, 'Phải có thông tin khoản vay');
  assert.strictEqual(result.loan.amount, 150, 'Trường amount khớp với số tiền vay');
  assert.strictEqual(result.loan.principal, 150, 'Trường principal cung cấp nợ gốc');
  assert.strictEqual(result.loan.debt, 165, 'Trường debt cung cấp tổng nợ');
  assert.strictEqual(result.loan.isOverdue, false, 'isOverdue cung cấp trạng thái quá hạn');

  console.log('✓ Test 6: AI Thống Đốc tiếp nhận đầy đủ amount, principal, debt, depositInterest và isOverdue.');
}

console.log('\n🎉 TẤT CẢ 6/6 BỘ KIỂM THỬ CHUYÊN SÂU CÁC BẢN VÁ LỖI NGÂN HÀNG ĐÃ VƯỢT QUA XUẤT SẮC 100%!\n');
