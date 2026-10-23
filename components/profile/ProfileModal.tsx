'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';

interface ProfileWindow extends Window {
  openProfileModal?: () => void;
  levelupReactProfile?: boolean;
  triggerSave?: (needsCloud?: boolean, immediate?: boolean) => void;
  loadFromCloud?: () => Promise<void>;
  logoutGoogle?: () => Promise<void>;
  switchGoogleAccount?: () => Promise<void>;
  openModal?: (id: string) => void;
  openLevelInfoModal?: () => void;
  openStreakInfoModal?: () => void;
  openPaletteStudio?: () => void;
  startInteractiveTour?: (force?: boolean) => void;
  getStreakBonusPercent?: (streak: number) => number;
  getStreakTitle?: (streak: number) => string;
  showToast?: (message: string, type: string) => void;
  appState?: {
    profile: Record<string, unknown>;
    pendingOldNickname?: string;
    lastModified?: number;
    lastSyncedAt?: number;
  };
  sfx?: { playClick?: () => void };
}

const avatars = ['⚔️', '🧙‍♂️', '🏹', '🛡️', '🥷', '👑'];
const modalCard = 'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60';

function notify(message: string, type: 'success' | 'error' | 'info') {
  (window as ProfileWindow).showToast?.(message, type);
}

function isAvatarUrl(avatar: string) {
  return /^(https?:\/\/|\/|data:image\/)/i.test(avatar);
}

export function ProfileModal() {
  const {
    state,
    isSyncing,
    toggleSound,
    togglePalette,
    toggleTheme,
  } = useLevelUp();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('⚔️');
  const [saving, setSaving] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profile = state.profile;
  const legacyWindow = typeof window === 'undefined' ? undefined : window as ProfileWindow;
  const streak = Math.max(0, Number.parseInt(String(profile.streak), 10) || 0);
  const streakTitle = legacyWindow?.getStreakTitle?.(streak) || (streak >= 30 ? 'Bất Bại 👑' : streak >= 14 ? 'Chuyên Cần' : streak >= 7 ? 'Bền Bỉ' : streak >= 3 ? 'Cần Mẫn' : 'Khởi Đầu');
  const streakBonus = legacyWindow?.getStreakBonusPercent?.(streak) ?? (streak >= 30 ? 20 : streak >= 14 ? 15 : streak >= 7 ? 10 : streak >= 3 ? 5 : 0);
  const googlePicture = profile.googlePicture || '';
  const linked = Boolean(profile.googleId);
  const syncTime = useMemo(() => {
    const timestamp = state.lastSyncedAt;
    return timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN') : '-';
  }, [state.lastSyncedAt]);

  useEffect(() => {
    const target = window as ProfileWindow;
    target.openProfileModal = () => {
      setNickname(target.appState?.profile?.nickname as string || profile.nickname || '');
      setAvatar(profile.avatar || '⚔️');
      setAvatarFailed(false);
      setOpen(true);
    };
    target.levelupReactProfile = true;
    return () => {
      delete target.openProfileModal;
      delete target.levelupReactProfile;
    };
  }, [profile.avatar, profile.nickname]);

  const close = () => {
    if (!saving) setOpen(false);
  };

  const save = async () => {
    const nick = nickname.trim();
    if (!nick) {
      notify('Tên hiển thị không được để trống.', 'error');
      return;
    }

    const oldNickname = profile.nickname || '';
    if (linked && oldNickname && oldNickname !== nick) {
      const token = profile.googleToken || profile.sessionToken || '';
      try {
        const response = await fetch(`/api/sync?action=check_nickname&nickname=${encodeURIComponent(nick)}&token=${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json() as { available?: boolean };
          if (!result.available) {
            notify(`Tên "${nick}" đã có người sử dụng. Vui lòng chọn tên khác.`, 'error');
            return;
          }
        } else {
          console.warn(`[ProfileModal] Nickname availability check failed (HTTP ${response.status}).`);
        }
      } catch (error) {
        console.warn('[ProfileModal] Nickname availability check unavailable; proceeding as offline mode.', error);
      }
    }

    const currentState = legacyWindow?.appState;
    if (!currentState?.profile) {
      notify('Không thể lưu hồ sơ: trạng thái ứng dụng chưa sẵn sàng.', 'error');
      return;
    }
    if (linked && oldNickname !== nick) {
      currentState.pendingOldNickname = currentState.pendingOldNickname || oldNickname;
    }
    if (nick === currentState.pendingOldNickname) delete currentState.pendingOldNickname;

    const nextState = {
      ...state,
      profile: { ...state.profile, nickname: nick, avatar },
      lastModified: Date.now(),
    };
    Object.assign(currentState, nextState);
    window.dispatchEvent(new CustomEvent('levelup:state-updated', { detail: nextState }));

    setSaving(true);
    try {
      legacyWindow.triggerSave?.(true, true);
      notify('Đã lưu hồ sơ và đồng bộ.', 'info');
      setOpen(false);
    } catch (error) {
      console.error('[ProfileModal] Failed to save profile:', error);
      notify('Không thể lưu hồ sơ. Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = (value: string) => {
    setAvatar(value);
    legacyWindow?.sfx?.playClick?.();
  };

  if (!open) return null;

  return (
    <div id="modal-profile" className="m3-modal-sheet fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" className="rpg-panel m3-dialog-panel modal-fade flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 shadow-2xl dark:border-slate-800 sm:max-w-md">
        <div className="m3-drag-handle sm:hidden" />
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <h2 id="profile-modal-title" className="font-rpg-title text-sm font-extrabold text-amber-600 dark:text-amber-400 sm:text-base">HỒ SƠ CÁ NHÂN & CÀI ĐẶT</h2>
          <button type="button" aria-label="Đóng" onClick={close} className="modal-close m3-icon-btn flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">✕</button>
        </header>

        <div className="space-y-3.5 overflow-y-auto p-5 sm:space-y-4 sm:p-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">1. Ảnh Đại Diện</label>
            <div className="flex flex-wrap items-center justify-center gap-2.5 py-2">
              {googlePicture && <button type="button" onClick={() => pickAvatar(googlePicture)} title="Sử dụng ảnh Google" className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all dark:bg-slate-800 ${avatar === googlePicture ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-200 dark:border-slate-700'}`}><img src={googlePicture} alt="Google Avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" /></button>}
              {avatars.map(value => <button key={value} type="button" onClick={() => pickAvatar(value)} aria-pressed={avatar === value} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 bg-white text-2xl shadow-sm transition-all hover:bg-amber-500/10 dark:bg-slate-800 ${avatar === value ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-200 dark:border-slate-700'}`}>{value}</button>)}
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">2. Tên Hiển Thị
            <input value={nickname} onChange={event => setNickname(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void save(); }} placeholder="Nhập tên hiển thị" className="rpg-input mt-1.5 w-full rounded-xl px-3.5 py-2.5 font-mono text-xs sm:px-4 sm:text-sm" />
            <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500 dark:text-slate-400">Tên hiển thị trên Bảng Xếp Hạng, được bảo vệ bằng mã tài khoản.</span>
          </label>

          <div className={modalCard}><span className="text-slate-500">Vai trò:</span><span className="rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">{profile.role === 'admin' ? '👑 Quản Trị Viên (Admin)' : '👤 Hiệp Sĩ'}</span></div>

          <div className={modalCard}>
            <div className="flex items-center gap-2"><span className="text-base">⭐</span><div><div className="font-bold text-slate-800 dark:text-slate-200">LV. {profile.level} • {profile.title || 'Tân Binh Cấp 1'}</div><div className="text-[10px] text-slate-500">{profile.exp} EXP</div></div></div>
            <button type="button" onClick={() => legacyWindow?.openLevelInfoModal?.()} className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">Cách tăng cấp ℹ️</button>
          </div>

          <div className={modalCard}>
            <div className="flex items-center gap-2"><span className="text-base">🔥</span><div><div className="font-bold text-slate-800 dark:text-slate-200">Chuỗi Chăm Chỉ: {streak} ngày ({streakTitle})</div><div className="font-mono text-[10px] text-orange-600 dark:text-orange-400">Thưởng nhiệm vụ: +{streakBonus}% Vàng</div></div></div>
            <button type="button" onClick={() => legacyWindow?.openStreakInfoModal?.()} className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">Chi tiết ℹ️</button>
          </div>

          <div className={modalCard}><span className="text-slate-500">Chế độ giao diện:</span><button type="button" onClick={toggleTheme} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold dark:bg-slate-800">{profile.theme === 'dark' ? '🌙 Chế độ tối' : '☀️ Chế độ sáng'}</button></div>
          <div className={modalCard}><span className="text-slate-500">Âm thanh:</span><button type="button" onClick={toggleSound} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold dark:bg-slate-800">{profile.soundEnabled ? '🔊 Đang bật' : '🔇 Đang tắt'}</button></div>
          <div className={modalCard}><span className="text-slate-500">Bảng màu:</span><div className="flex gap-1.5"><button type="button" onClick={() => togglePalette()} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold dark:bg-slate-800">⚡ Đổi màu</button><button type="button" onClick={() => legacyWindow?.openPaletteStudio?.()} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">Tùy chỉnh 🎨</button></div></div>

          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Tài Khoản Google</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${linked ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-slate-300 text-slate-500'}`}>{linked ? '● Đã xác thực' : 'Chưa liên kết'}</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
              {googlePicture && !avatarFailed ? <img src={googlePicture} alt="Google Avatar" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-base font-bold text-amber-600">{(profile.googleEmail || 'G').charAt(0).toUpperCase()}</span>}
              <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{profile.nickname || 'Hiệp Sĩ'}</div><div className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{profile.googleEmail || 'Chưa liên kết'}</div></div>
            </div>
            {linked && <div className="flex gap-2"><button type="button" onClick={() => void legacyWindow?.switchGoogleAccount?.()} className="flex-1 rounded-xl bg-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">🔄 Đổi Tài Khoản</button><button type="button" onClick={() => void legacyWindow?.logoutGoogle?.()} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">🚪 Đăng Xuất</button></div>}
          </div>

          <div className={`${modalCard} sub-panel`}><span className="text-slate-500">Trạng thái đồng bộ:</span><span className={isSyncing ? 'font-medium text-amber-600' : 'font-medium text-emerald-600'}>{isSyncing ? 'Đang đồng bộ...' : 'Đã sẵn sàng'}</span><span className="text-slate-500">Lần lưu gần nhất:</span><span className="font-mono text-slate-700 dark:text-slate-300">{syncTime}</span></div>
          <div className={modalCard}><span className="text-slate-500">Hướng dẫn sử dụng:</span><button type="button" onClick={() => { setOpen(false); legacyWindow?.startInteractiveTour?.(true); }} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">🎓 Xem Hướng Dẫn</button></div>
          <div className="border-t border-slate-200 pt-2 dark:border-slate-800"><button type="button" onClick={() => { setOpen(false); legacyWindow?.openModal?.('modal-cleanup'); }} className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">Dọn Dẹp & Gỡ Bỏ Ứng Dụng...</button></div>

          <footer className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button type="button" onClick={() => void legacyWindow?.loadFromCloud?.()} className="text-left text-xs font-medium text-amber-600 hover:underline dark:text-amber-400">📥 Tải lại dữ liệu trực tuyến</button>
            <div className="flex gap-2"><button type="button" onClick={close} className="rounded-xl px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Đóng</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
          </footer>
        </div>
      </section>
    </div>
  );
}
