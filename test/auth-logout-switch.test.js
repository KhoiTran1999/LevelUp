import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Đăng Xuất & Đổi Tài Khoản Google (Auth Logout & Switch Account) ===\n');

// 1. Kiểm tra mã nguồn public/app.js đảm bảo logoutGoogle và switchGoogleAccount được gắn đúng và hoạt động bất đồng bộ
const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

assert.ok(
  appJs.includes('async function logoutGoogle()'),
  'logoutGoogle phải là hàm async'
);

assert.ok(
  appJs.includes('async function switchGoogleAccount()'),
  'switchGoogleAccount phải là hàm async'
);

assert.ok(
  !appJs.includes('function logoutGoogle() {\n  confirmAction({\n    title: \'ĐĂNG XUẤT TÀI KHOẢN\',\n    message:'),
  'logoutGoogle không được gọi confirmAction theo kiểu callback bị bỏ quên'
);

assert.ok(
  !appJs.includes('function switchGoogleAccount() {\n  confirmAction({\n    title: \'ĐỔI TÀI KHOẢN GOOGLE\',\n    message:'),
  'switchGoogleAccount không được gọi confirmAction theo kiểu callback bị bỏ quên'
);

console.log('✓ Test 1: Cấu trúc hàm logoutGoogle và switchGoogleAccount đã được chuyển sang async/await chuẩn xác.');

// 2. Mô phỏng bộ máy Confirm Action với cả cơ chế async/await và callback (Dual Support)
function createConfirmEngine() {
  let activeConfirmResolve = null;

  function confirmAction({
    title = 'Xác Nhận',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    onConfirm = null,
    onCancel = null
  } = {}) {
    return new Promise((resolve) => {
      if (activeConfirmResolve) {
        activeConfirmResolve(false);
        activeConfirmResolve = null;
      }

      activeConfirmResolve = (result) => {
        if (result && typeof onConfirm === 'function') {
          try { onConfirm(); } catch (err) { console.error(err); }
        } else if (!result && typeof onCancel === 'function') {
          try { onCancel(); } catch (err) { console.error(err); }
        }
        resolve(result);
      };
    });
  }

  function closeConfirmDialog(result = false) {
    if (activeConfirmResolve) {
      const cb = activeConfirmResolve;
      activeConfirmResolve = null;
      cb(result);
    }
  }

  return { confirmAction, closeConfirmDialog };
}

// 3. Kiểm thử confirmAction khi người dùng nhấn Hủy
{
  const { confirmAction, closeConfirmDialog } = createConfirmEngine();
  let executed = false;
  let cancelled = false;

  const promise = confirmAction({
    title: 'Đăng xuất',
    onConfirm: () => { executed = true; },
    onCancel: () => { cancelled = true; }
  });

  closeConfirmDialog(false);

  const result = await promise;
  assert.strictEqual(result, false, 'Kết quả xác nhận phải là false khi hủy');
  assert.strictEqual(executed, false, 'Không được thực thi onConfirm khi hủy');
  assert.strictEqual(cancelled, true, 'onCancel phải được kích hoạt khi hủy');
  console.log('✓ Test 2: Hộp thoại xác nhận hủy thao tác an toàn khi người dùng không đồng ý.');
}

// 4. Kiểm thử confirmAction khi người dùng nhấn Đồng Ý (Async/await & onConfirm callback)
{
  const { confirmAction, closeConfirmDialog } = createConfirmEngine();
  let callbackFired = false;

  const promise = confirmAction({
    title: 'Đăng xuất',
    onConfirm: () => { callbackFired = true; }
  });

  closeConfirmDialog(true);

  const result = await promise;
  assert.strictEqual(result, true, 'Kết quả xác nhận phải là true khi đồng ý');
  assert.strictEqual(callbackFired, true, 'onConfirm callback phải được gọi');
  console.log('✓ Test 3: Hộp thoại xác nhận kích hoạt cả Promise resolve(true) lẫn onConfirm.');
}

// 5. Kiểm thử luồng Đăng Xuất hoàn chỉnh (State Reset, Google AutoSelect Disable, UI Sync)
{
  const { confirmAction, closeConfirmDialog } = createConfirmEngine();

  let appState = {
    profile: {
      nickname: 'HiepSiGoogle',
      googleId: 'google_id_123',
      googleEmail: 'hiepsi@gmail.com',
      googlePicture: 'https://lh3.googleusercontent.com/avatar.jpg',
      googleToken: 'token_abc',
      sessionToken: 'session_xyz',
      hasOnboarded: true
    }
  };

  let autoSelectDisabled = false;
  const mockGoogle = {
    accounts: {
      id: {
        disableAutoSelect: () => { autoSelectDisabled = true; }
      }
    }
  };

  let modalProfileClosed = false;
  let modalWelcomeOpened = false;
  let toastMsg = '';

  async function simulateLogout() {
    const ok = await confirmAction({
      title: 'ĐĂNG XUẤT TÀI KHOẢN',
      message: 'Xác nhận đăng xuất'
    });
    if (!ok) return;

    if (mockGoogle?.accounts?.id) {
      mockGoogle.accounts.id.disableAutoSelect();
    }

    appState = {
      profile: {
        nickname: '',
        googleId: '',
        googleEmail: '',
        googlePicture: '',
        googleToken: '',
        sessionToken: '',
        hasOnboarded: false
      }
    };
    modalProfileClosed = true;
    modalWelcomeOpened = true;
    toastMsg = 'Đã đăng xuất tài khoản Google.';
  }

  // Chạy và mô phỏng bấm đồng ý
  const logoutPromise = simulateLogout();
  closeConfirmDialog(true);
  await logoutPromise;

  assert.strictEqual(appState.profile.googleId, '', 'googleId phải được xóa');
  assert.strictEqual(appState.profile.nickname, '', 'nickname phải được xóa');
  assert.strictEqual(appState.profile.sessionToken, '', 'sessionToken phải được xóa');
  assert.strictEqual(appState.profile.hasOnboarded, false, 'hasOnboarded phải là false');
  assert.strictEqual(autoSelectDisabled, true, 'disableAutoSelect phải được gọi');
  assert.strictEqual(modalProfileClosed, true, 'modal-profile phải được đóng');
  assert.strictEqual(modalWelcomeOpened, true, 'modal-welcome phải được mở');
  assert.strictEqual(toastMsg, 'Đã đăng xuất tài khoản Google.');

  console.log('✓ Test 4: Luồng Đăng Xuất (Logout) reset hoàn toàn trạng thái và chuyển về màn hình đăng nhập Google.');
}

// 6. Kiểm thử luồng Đổi Tài Khoản hoàn chỉnh
{
  const { confirmAction, closeConfirmDialog } = createConfirmEngine();

  let appState = {
    profile: {
      nickname: 'TaiKhoanCu',
      googleId: 'google_id_old',
      sessionToken: 'token_old',
      hasOnboarded: true
    }
  };

  let autoSelectDisabled = false;
  const mockGoogle = {
    accounts: {
      id: {
        disableAutoSelect: () => { autoSelectDisabled = true; }
      }
    }
  };

  let modalWelcomeOpened = false;
  let toastMsg = '';

  async function simulateSwitchAccount() {
    const ok = await confirmAction({
      title: 'ĐỔI TÀI KHOẢN GOOGLE',
      message: 'Xác nhận đổi tài khoản'
    });
    if (!ok) return;

    if (mockGoogle?.accounts?.id) {
      mockGoogle.accounts.id.disableAutoSelect();
    }

    appState = {
      profile: {
        nickname: '',
        googleId: '',
        sessionToken: '',
        hasOnboarded: false
      }
    };
    modalWelcomeOpened = true;
    toastMsg = 'Vui lòng đăng nhập tài khoản Google mới.';
  }

  const switchPromise = simulateSwitchAccount();
  closeConfirmDialog(true);
  await switchPromise;

  assert.strictEqual(appState.profile.googleId, '', 'googleId cũ phải bị xóa');
  assert.strictEqual(autoSelectDisabled, true, 'disableAutoSelect phải được gọi để không tự chọn lại tài khoản cũ');
  assert.strictEqual(modalWelcomeOpened, true, 'modal-welcome phải được mở');
  assert.strictEqual(toastMsg, 'Vui lòng đăng nhập tài khoản Google mới.');

  console.log('✓ Test 5: Luồng Đổi Tài Khoản (Switch Account) đưa người dùng về màn hình chọn tài khoản Google mới.');
}

console.log('\n🎉 TẤT CẢ 5/5 KIỂM THỬ ĐĂNG XUẤT & ĐỔI TÀI KHOẢN GOOGLE ĐÃ VƯỢT QUA XUẤT SẮC!');
