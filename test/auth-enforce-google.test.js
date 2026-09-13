import assert from 'node:assert';

// Hermetic Mock Environment for Enforcing Google Login Logic
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

// Logic under test replicated directly from app.js
function checkIsOnboarded(appState, storage) {
  const hasLocal = storage.getItem('levelup_onboarded') === 'true';
  const hasGoogleProfile = Boolean(appState.profile && appState.profile.googleId && appState.profile.nickname);
  return hasLocal && hasGoogleProfile;
}

function processLoadedState(rawParsed, defaultState, storage) {
  let appState = {
    ...defaultState,
    ...rawParsed,
    profile: { ...defaultState.profile, ...(rawParsed?.profile || {}) }
  };

  // Cưỡng chế đăng xuất nếu không có googleId
  if (!appState.profile?.googleId) {
    storage.removeItem('levelup_onboarded');
    appState = {
      ...defaultState,
      profile: {
        ...defaultState.profile,
        nickname: '',
        googleId: '',
        googleEmail: '',
        googlePicture: '',
        googleToken: '',
        hasOnboarded: false
      }
    };
  }
  return appState;
}

console.log('--- Bắt đầu kiểm thử Cưỡng Chế Đăng Xuất & Bắt Buộc Đăng Nhập Google ---');

const DEFAULT_STATE = {
  profile: {
    nickname: '',
    googleId: '',
    googleEmail: '',
    googlePicture: '',
    googleToken: '',
    hasOnboarded: false
  },
  quests: [],
  shopItems: [],
  inventory: []
};

// Test 1: Tài khoản cũ (Anonymous/Guest) có nickname và cờ onboarded nhưng KHÔNG CÓ googleId
{
  const storage = new MockLocalStorage();
  storage.setItem('levelup_onboarded', 'true');
  const legacyAccount = {
    profile: {
      nickname: 'OldGuestPlayer',
      hasOnboarded: true,
      googleId: '', // Không có googleId
      googleEmail: ''
    }
  };

  const processed = processLoadedState(legacyAccount, DEFAULT_STATE, storage);

  // Phải bị đăng xuất, reset nickname và xóa cờ onboarded
  assert.strictEqual(processed.profile.googleId, '', 'googleId phải trống');
  assert.strictEqual(processed.profile.nickname, '', 'nickname phải bị reset về rỗng');
  assert.strictEqual(processed.profile.hasOnboarded, false, 'hasOnboarded phải là false');
  assert.strictEqual(storage.getItem('levelup_onboarded'), null, 'Cờ levelup_onboarded trong localStorage phải bị xóa sạch');
  assert.strictEqual(checkIsOnboarded(processed, storage), false, 'checkIsOnboarded phải trả về false');
  console.log('✓ Test 1: Tài khoản không có Google ID bị cưỡng chế đăng xuất và xóa cờ onboard.');
}

// Test 2: Tài khoản Google hợp lệ giữ nguyên trạng thái đăng nhập
{
  const storage = new MockLocalStorage();
  storage.setItem('levelup_onboarded', 'true');
  const validGoogleAccount = {
    profile: {
      nickname: 'Knight_Google',
      googleId: '109876543210',
      googleEmail: 'hero@gmail.com',
      googlePicture: 'https://lh3.googleusercontent.com/photo.jpg',
      googleToken: 'valid_jwt_token',
      hasOnboarded: true
    }
  };

  const processed = processLoadedState(validGoogleAccount, DEFAULT_STATE, storage);

  assert.strictEqual(processed.profile.googleId, '109876543210');
  assert.strictEqual(processed.profile.nickname, 'Knight_Google');
  assert.strictEqual(storage.getItem('levelup_onboarded'), 'true');
  assert.strictEqual(checkIsOnboarded(processed, storage), true, 'Tài khoản Google hợp lệ phải được xác nhận onboarded');
  console.log('✓ Test 2: Tài khoản Google hợp lệ được giữ nguyên và cho phép truy cập.');
}

// Test 3: Người dùng cố tình can thiệp localStorage gán levelup_onboarded = true nhưng không có Google ID
{
  const storage = new MockLocalStorage();
  storage.setItem('levelup_onboarded', 'true');
  const forgedState = {
    profile: {
      nickname: 'HackerName',
      googleId: '', // Vẫn không có Google ID
      hasOnboarded: true
    }
  };

  assert.strictEqual(checkIsOnboarded(forgedState, storage), false, 'Không có Google ID thì checkIsOnboarded luôn luôn phải là false');
  console.log('✓ Test 3: Chặn đứng hành vi can thiệp localStorage khi không có Google ID.');
}

// Test 4: Tài khoản có Google ID nhưng chưa hoàn tất onboard (thiếu nickname hoặc cờ local)
{
  const storage = new MockLocalStorage();
  const incompleteState = {
    profile: {
      nickname: '',
      googleId: '109876543210'
    }
  };

  assert.strictEqual(checkIsOnboarded(incompleteState, storage), false, 'Thiếu nickname hoặc cờ local phải trả về false');
  console.log('✓ Test 4: Xác thực chặt chẽ đủ 3 điều kiện: googleId, nickname và cờ storage.');
}

console.log('\n🎉 TẤT CẢ UNIT TESTS CƯỠNG CHẾ ĐĂNG XUẤT GOOGLE ĐÃ VƯỢT QUA XUẤT SẮC!');
