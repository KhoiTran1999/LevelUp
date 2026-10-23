'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

interface AdminUser {
  sub: string;
  nickname: string;
  email?: string;
  avatar?: string;
  level: number;
  exp: number;
  coins: number;
  totalCoinsEarned?: number;
  title?: string;
  role: string;
  isCheater: boolean;
  cheatStrikes?: number;
  bank?: { loan?: { isOverdue?: boolean } | null; isFrozen?: boolean } | null;
  ledgerCount?: number;
  questsCount?: number;
  lastSyncedAt?: number;
}

interface LedgerEntry {
  id: string;
  type: string;
  title?: string;
  description?: string;
  amount?: number;
  timestamp?: number;
}

interface BankPool {
  poolGold?: number;
  totalBorrowed?: number;
  utilization?: number;
  reserveFund?: number;
  bailoutDebt?: number;
  depositRate?: number;
  borrowRate?: number;
  spread?: number;
  totalDeposited?: number;
}

interface AdminResponse {
  error?: string;
  message?: string;
  users?: AdminUser[];
  ledger?: LedgerEntry[];
  pool?: BankPool;
}

type UserFilter = 'all' | 'adventurer' | 'admin' | 'cheater';

interface UserEditForm {
  coins: string;
  level: string;
  exp: string;
  isCheater: boolean;
  reason: string;
}

const numberFormat = new Intl.NumberFormat('vi-VN');
const panelClass = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const buttonClass = 'rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50';
const statColors = {
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const;
const metricColors = {
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
} as const;

function notify(message: string, type: 'success' | 'error' = 'success') {
  window.showToast?.(message, type);
}

function avatarIsUrl(avatar?: string) {
  return Boolean(avatar && /^(https?:\/\/|data:image\/)/i.test(avatar));
}

function getRequestError(data: AdminResponse, status: number) {
  return data.error || `Yêu cầu thất bại (HTTP ${status}).`;
}

export function AdminDashboard() {
  const { state, activeTab, updateProfile } = useLevelUp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pool, setPool] = useState<BankPool | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserEditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [ledgerUser, setLedgerUser] = useState<AdminUser | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const requestHeaders = useCallback((json = false): HeadersInit => {
    const token = state.profile.sessionToken || state.profile.googleToken || state.profile.token;
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [state.profile.googleToken, state.profile.sessionToken, state.profile.token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sync?action=admin_list_users', {
        credentials: 'include',
        headers: requestHeaders(),
      });
      const data = await response.json() as AdminResponse;
      if (!response.ok) throw new Error(getRequestError(data, response.status));
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể tải danh sách người chơi.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [requestHeaders]);

  const fetchBankPool = useCallback(async () => {
    const response = await fetch('/api/sync?action=bank_state', {
      credentials: 'include',
      headers: requestHeaders(),
    });
    const data = await response.json() as AdminResponse;
    if (!response.ok) throw new Error(getRequestError(data, response.status));
    setPool(data.pool || null);
  }, [requestHeaders]);

  useEffect(() => {
    if (activeTab !== 'admin' || state.profile.role !== 'admin') return;
    void fetchUsers();
    void fetchBankPool().catch(cause => {
      notify(cause instanceof Error ? cause.message : 'Không thể tải trạng thái ngân hàng.', 'error');
    });
  }, [activeTab, fetchBankPool, fetchUsers, state.profile.role]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter(user => {
      if (filter === 'adventurer' && (user.role === 'admin' || user.isCheater)) return false;
      if (filter === 'admin' && user.role !== 'admin') return false;
      if (filter === 'cheater' && !user.isCheater) return false;
      return !query || [user.nickname, user.email, user.sub].some(value => value?.toLocaleLowerCase().includes(query));
    });
  }, [filter, search, users]);

  const overdueCount = users.filter(user => user.bank?.loan?.isOverdue || user.bank?.isFrozen).length;
  const totalCoins = users.reduce((sum, user) => sum + (Number.isFinite(user.coins) ? user.coins : 0), 0);
  const averageLevel = users.length ? users.reduce((sum, user) => sum + (user.level || 1), 0) / users.length : 1;
  const cheaterCount = users.filter(user => user.isCheater).length;
  const utilization = Math.round((pool?.utilization || 0) * 100);
  const bailoutActive = Boolean(pool?.bailoutDebt);

  const isCurrentUser = useCallback((user: AdminUser) => {
    const profile = state.profile;
    return Boolean(
      (profile.googleId && user.sub === profile.googleId) ||
      user.nickname?.toLocaleLowerCase() === profile.nickname?.toLocaleLowerCase()
    );
  }, [state.profile]);

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      coins: String(user.coins ?? 0),
      level: String(user.level || 1),
      exp: String(user.exp || 0),
      isCheater: user.isCheater,
      reason: '',
    });
  };

  const loadLedger = async (user: AdminUser) => {
    setLedgerUser(user);
    setLedger([]);
    setSelectedLedgerIds(new Set());
    setLedgerError('');
    setLedgerLoading(true);
    try {
      const response = await fetch(`/api/sync?action=admin_get_user_ledger&targetSub=${encodeURIComponent(user.sub)}`, {
        credentials: 'include',
        headers: requestHeaders(),
      });
      const data = await response.json() as AdminResponse;
      if (!response.ok) throw new Error(getRequestError(data, response.status));
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
    } catch (cause) {
      setLedgerError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử giao dịch.');
    } finally {
      setLedgerLoading(false);
    }
  };

  const confirmDestructive = async (options: {
    title: string;
    message: string;
    detail: string;
    confirmText: string;
    icon: string;
  }) => {
    if (window.confirmAction) return window.confirmAction({ ...options, cancelText: 'Hủy', btnColor: 'rose' });
    return window.confirm(`${options.title}\n\n${options.message}\n${options.detail}`);
  };

  const submitEdit = async () => {
    if (!editUser || !editForm) return;
    const coins = Number.parseInt(editForm.coins, 10);
    const level = Number.parseInt(editForm.level, 10);
    const exp = Number.parseInt(editForm.exp, 10);
    if (!Number.isInteger(coins) || coins < 0) {
      notify('Số Vàng phải là số nguyên lớn hơn hoặc bằng 0.', 'error');
      return;
    }
    if (!Number.isInteger(level) || level < 1 || level > 100) {
      notify('Cấp độ phải từ 1 đến 100.', 'error');
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch('/api/sync?action=admin_update_user', {
        method: 'POST',
        credentials: 'include',
        headers: requestHeaders(true),
        body: JSON.stringify({
          targetSub: editUser.sub,
          coins,
          level,
          exp: Number.isInteger(exp) ? exp : 0,
          isCheater: editForm.isCheater,
          reason: editForm.reason.trim() || '👑 Quản trị viên tinh chỉnh chỉ số',
        }),
      });
      const data = await response.json() as AdminResponse;
      if (!response.ok) throw new Error(getRequestError(data, response.status));

      if (isCurrentUser(editUser)) {
        updateProfile({
          coins,
          level,
          exp: Number.isInteger(exp) ? exp : 0,
          totalCoinsEarned: Math.max(coins, Number(state.profile.totalCoinsEarned) || 20),
          adminAdjusted: true,
          isCheater: editForm.isCheater,
          ...(editForm.isCheater ? { title: 'Kẻ Gian Lận ⚠️' } : {}),
        });
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('levelup_sync_channel');
          channel.postMessage({ type: 'ADMIN_SYNC_UPDATE', targetSub: editUser.sub, timestamp: Date.now() });
          channel.close();
        }
      }

      notify(data.message || 'Cập nhật chỉ số người chơi thành công!', 'success');
      setEditUser(null);
      await fetchUsers();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Không thể cập nhật người chơi.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!(await confirmDestructive({
      title: 'Xóa Tài Khoản Khỏi Hệ Thống',
      message: `Xóa tài khoản "${user.nickname || user.sub}" khỏi hệ thống LevelUp?`,
      detail: 'Hồ sơ, điểm bảng xếp hạng và toàn bộ dữ liệu sẽ bị xóa vĩnh viễn.',
      confirmText: 'Xóa Vĩnh Viễn',
      icon: '🗑️',
    }))) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/sync?action=admin_remove', {
        method: 'POST',
        credentials: 'include',
        headers: requestHeaders(true),
        body: JSON.stringify({ targetSub: user.sub, targetNickname: user.nickname || user.sub }),
      });
      const data = await response.json() as AdminResponse;
      if (!response.ok) throw new Error(getRequestError(data, response.status));
      notify(data.message || `Đã xóa thành công tài khoản "${user.nickname}".`, 'success');
      await fetchUsers();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Không thể xóa tài khoản.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteLedgerEntries = async (entryIds: string[] | 'all') => {
    if (!ledgerUser) return;
    const bulk = Array.isArray(entryIds);
    const count = bulk ? entryIds.length : ledger.length;
    if (bulk && count === 0) return;
    if (!(await confirmDestructive({
      title: bulk ? `Xóa ${count} Giao Dịch` : 'Xóa Sạch Lịch Sử Thu Chi',
      message: bulk
        ? `Xóa đồng loạt ${count} bản ghi giao dịch đã chọn khỏi sổ cái?`
        : `Xóa toàn bộ lịch sử thu chi của ${ledgerUser.nickname}?`,
      detail: bulk
        ? 'Hành động này sẽ xóa vĩnh viễn các bản ghi đã chọn.'
        : 'Toàn bộ giao dịch sẽ bị xóa và thay thế bằng 1 bản ghi hệ thống mới.',
      confirmText: bulk ? `Xóa ${count} Bản Ghi` : 'Xóa Sạch Ngay',
      icon: bulk ? '🗑️' : '🧹',
    }))) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/sync?action=admin_clear_user_ledger', {
        method: 'POST',
        credentials: 'include',
        headers: requestHeaders(true),
        body: JSON.stringify({
          targetSub: ledgerUser.sub,
          ...(bulk ? { entryIds } : { entryId: 'all' }),
        }),
      });
      const data = await response.json() as AdminResponse;
      if (!response.ok) throw new Error(getRequestError(data, response.status));
      notify(data.message || 'Đã cập nhật lịch sử giao dịch.', 'success');
      await Promise.all([loadLedger(ledgerUser), fetchUsers()]);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Không thể xóa giao dịch.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filterButton = (key: UserFilter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`${buttonClass} shrink-0 ${filter === key
        ? 'border-purple-600 bg-purple-600 text-white'
        : 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {label}
    </button>
  );

  if (state.profile.role !== 'admin') {
    return <section id="tab-admin" className="tab-pane hidden" />;
  }

  return (
    <>
      <section id="tab-admin" className="tab-pane hidden">
        <header className="mb-4 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-rpg-title flex items-center gap-1.5 text-base font-extrabold text-purple-600 dark:text-purple-400 sm:text-xl">
                <span>👑</span> BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN
              </h2>
              <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">Admin Only</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Quản lý người chơi, tinh chỉnh Vàng, Cấp độ, lịch sử thu chi và bảo vệ hệ thống.</p>
          </div>
          <button type="button" onClick={() => void fetchUsers()} disabled={loading} className={`${buttonClass} self-start border-purple-600 bg-purple-600 text-white sm:self-auto`}>
            🔄 {loading ? 'Đang tải...' : 'Làm Mới'}
          </button>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5 sm:gap-3 lg:grid-cols-4">
          {[
            ['👥', 'Tổng Người Chơi', numberFormat.format(users.length), 'purple'],
            ['🪙', 'Vàng Lưu Thông', numberFormat.format(totalCoins), 'amber'],
            ['⭐', 'Cấp Trung Bình', `Lv. ${averageLevel.toFixed(1)}`, 'blue'],
            ['⚠️', 'Tài Khoản Vi Phạm', String(cheaterCount), 'rose'],
          ].map(([icon, label, value, color]) => (
            <div key={label} className={`${panelClass} flex items-center gap-2.5 p-3 sm:p-4`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${statColors[color as keyof typeof statColors]}`}>{icon}</span>
              <div className="min-w-0">
                <div className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
                <div className={`font-mono text-lg font-bold ${statColors[color as keyof typeof statColors].split(' ').slice(1).join(' ')}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        <section className={`${panelClass} mb-5 p-3.5 sm:mb-6 sm:p-5`}>
          <div className="mb-3.5 flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-rpg-title text-sm font-bold text-purple-700 dark:text-purple-300 sm:text-base">🏛️ GIÁM SÁT KHO BẠC & NGÂN HÀNG TRUNG ƯƠNG</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Theo dõi quỹ Vàng, tỷ lệ cho vay, lãi suất và hỗ trợ ứng vốn.</p>
            </div>
            <span className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold ${bailoutActive
              ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
              {bailoutActive ? `⚠️ Cứu trợ: ${numberFormat.format(pool?.bailoutDebt || 0)}` : '🛡️ Hệ Thống An Toàn'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['Quỹ Vàng Có Sẵn (P)', numberFormat.format(pool?.poolGold ?? 500), 'amber'],
              ['Đang Cho Vay (B)', numberFormat.format(pool?.totalBorrowed ?? 0), 'blue'],
              ['Tỷ Lệ Quỹ Cho Vay (U)', `${utilization}%`, 'purple'],
              ['Quỹ Dự Phòng (R)', numberFormat.format(pool?.reserveFund ?? 150), 'purple'],
              ['Vàng Ứng Từ Kho Bạc', numberFormat.format(pool?.bailoutDebt ?? 0), 'emerald'],
              ['Chênh lệch lãi suất', `${((pool?.spread ?? ((pool?.borrowRate || 0.05) - (pool?.depositRate || 0.0015))) * 100).toFixed(1)}%`, 'blue'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
                {label.includes('(U)') ? (
                  <>
                    <span className="my-1 font-mono text-base font-black text-slate-700 dark:text-slate-200">{value}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full ${utilization > 80 ? 'bg-rose-500' : utilization > 50 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, Math.max(0, utilization))}%` }} /></div>
                  </>
                ) : <span className={`my-1 font-mono text-base font-black ${metricColors[color as keyof typeof metricColors]}`}>{value}</span>}
                {label === 'Chênh lệch lãi suất' && <span className="text-[9px] text-slate-400">Gửi {((Math.min(0.0025, pool?.depositRate || 0.0015)) * 100).toFixed(2)}% · Vay {((pool?.borrowRate || 0.05) * 100).toFixed(1)}%/ngày</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">💰 Tổng Vàng Gửi Tiết Kiệm: <b className="font-mono text-emerald-600 dark:text-emerald-400">{numberFormat.format(pool?.totalDeposited ?? 0)}</b></span>
            <span className="text-slate-600 dark:text-slate-400">📋 Tài Khoản Nợ Quá Hạn: <b className="font-mono text-rose-600 dark:text-rose-400">{overdueCount}</b></span>
          </div>
        </section>

        <div className="mb-4 flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm theo Nickname, Email hoặc ID..."
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="horizontal-scroll-drag no-scrollbar -mx-1 flex max-w-full select-none items-center gap-1.5 overflow-x-auto px-1 py-0.5 sm:mx-0 sm:px-0">
            {filterButton('all', 'Tất Cả')}
            {filterButton('adventurer', 'Hiệp Sĩ')}
            {filterButton('admin', 'Admin 👑')}
            {filterButton('cheater', 'Vi Phạm ⚠️')}
          </div>
        </div>

        {error && <div role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</div>}
        {loading && users.length === 0
          ? <div className={`${panelClass} p-8 text-center text-xs text-slate-500`}>Đang tải danh sách người chơi...</div>
          : filteredUsers.length === 0
            ? <div className={`${panelClass} p-8 text-center text-xs text-slate-400`}>Không tìm thấy người chơi nào phù hợp với bộ lọc.</div>
            : <>
              <div className={`${panelClass} hidden overflow-hidden md:block`}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                      <th className="px-4 py-2.5">Người Chơi</th><th className="px-4 py-2.5 text-center">Cấp Độ</th><th className="px-4 py-2.5 text-right">Vàng Hiện Tại</th><th className="px-4 py-2.5 text-center">Lịch Sử</th><th className="px-4 py-2.5 text-center">Trạng Thái</th><th className="px-4 py-2.5 text-center">Hành Động</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {filteredUsers.map(user => <UserRow key={user.sub} user={user} self={isCurrentUser(user)} busy={actionLoading} onEdit={openEdit} onLedger={user => void loadLedger(user)} onDelete={user => void deleteUser(user)} />)}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {filteredUsers.map(user => <UserCard key={user.sub} user={user} self={isCurrentUser(user)} busy={actionLoading} onEdit={openEdit} onLedger={user => void loadLedger(user)} onDelete={user => void deleteUser(user)} />)}
              </div>
            </>}
      </section>

      {editUser && editForm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !editLoading) setEditUser(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="admin-edit-title" className={`${panelClass} max-h-[92vh] w-full max-w-lg overflow-y-auto border-purple-500/40 shadow-2xl`}>
          <header className="flex items-center justify-between border-b border-purple-500/20 bg-purple-50 px-4 py-3.5 dark:bg-purple-950/40 sm:px-6">
            <div><h2 id="admin-edit-title" className="font-rpg-title text-sm font-extrabold text-purple-600 dark:text-purple-400">TINH CHỈNH NGƯỜI CHƠI</h2><p className="text-[10px] text-slate-500">Trực tiếp điều chỉnh Vàng, Cấp độ, EXP và trạng thái</p></div>
            <button type="button" aria-label="Đóng" onClick={() => setEditUser(null)} disabled={editLoading} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">✕</button>
          </header>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={editUser} className="h-12 w-12 rounded-xl border border-purple-500/30 text-2xl" />
                <div className="min-w-0"><div className="truncate text-sm font-bold">{editUser.nickname || 'Chưa đặt tên'}</div><div className="truncate font-mono text-[10px] text-slate-500">{editUser.email || editUser.sub}</div></div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-purple-600 dark:text-purple-400">{editUser.title || 'Hiệp sĩ'}<div className="font-mono font-bold text-slate-700 dark:text-slate-300">Lv. {editUser.level} · {numberFormat.format(editUser.coins)} Vàng</div></div>
            </div>
            <label className="block text-xs font-bold">Số Vàng hiện tại
              <input type="number" min="0" value={editForm.coins} onChange={event => setEditForm({ ...editForm, coins: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 font-mono dark:border-slate-700" />
            </label>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[50, 200, 1000, 5000].map(amount => <button key={amount} type="button" onClick={() => setEditForm({ ...editForm, coins: String(Math.max(0, Number.parseInt(editForm.coins, 10) || 0) + amount) })} className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 font-bold text-amber-700 dark:text-amber-300">+{numberFormat.format(amount)}</button>)}
              <button type="button" onClick={() => setEditForm({ ...editForm, coins: '0' })} className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 font-bold text-rose-600">Về 0</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Cấp độ (1–100)
                <input type="number" min="1" max="100" value={editForm.level} onChange={event => setEditForm({ ...editForm, level: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 font-mono dark:border-slate-700" />
              </label>
              <label className="text-xs font-bold">EXP
                <input type="number" min="0" value={editForm.exp} onChange={event => setEditForm({ ...editForm, exp: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 font-mono dark:border-slate-700" />
              </label>
            </div>
            <label className="block text-xs font-bold">Lý do điều chỉnh
              <input value={editForm.reason} onChange={event => setEditForm({ ...editForm, reason: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 dark:border-slate-700" />
            </label>
            <fieldset className="flex gap-4 text-xs"><legend className="mb-2 font-bold">Trạng thái tài khoản</legend>
              <label className="flex items-center gap-2"><input type="radio" checked={!editForm.isCheater} onChange={() => setEditForm({ ...editForm, isCheater: false })} /> Hiệp sĩ</label>
              <label className="flex items-center gap-2 text-rose-600"><input type="radio" checked={editForm.isCheater} onChange={() => setEditForm({ ...editForm, isCheater: true })} /> Gian lận</label>
            </fieldset>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
            <button type="button" onClick={() => setEditUser(null)} disabled={editLoading} className={`${buttonClass} border-slate-300`}>Hủy</button>
            <button type="button" onClick={() => void submitEdit()} disabled={editLoading} className={`${buttonClass} border-purple-600 bg-purple-600 text-white`}>{editLoading ? '⏳ Đang lưu...' : '💾 Lưu Tinh Chỉnh'}</button>
          </footer>
        </section>
      </div>}

      {ledgerUser && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !actionLoading) setLedgerUser(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="admin-ledger-title" className={`${panelClass} flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border-amber-500/30 shadow-2xl`}>
          <header className="flex items-center justify-between border-b border-amber-500/20 bg-amber-50 p-4 dark:bg-amber-950/30">
            <div className="min-w-0"><h2 id="admin-ledger-title" className="font-rpg-title truncate text-sm font-extrabold text-amber-700 dark:text-amber-300">SỔ GIAO DỊCH · {ledgerUser.nickname}</h2><p className="text-[10px] text-slate-500">{ledger.length} giao dịch</p></div>
            <button type="button" aria-label="Đóng" onClick={() => setLedgerUser(null)} disabled={actionLoading} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">✕</button>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3 text-xs dark:border-slate-800">
            <label className="flex items-center gap-2"><input type="checkbox" checked={ledger.length > 0 && selectedLedgerIds.size === ledger.length} ref={element => { if (element) element.indeterminate = selectedLedgerIds.size > 0 && selectedLedgerIds.size < ledger.length; }} onChange={event => setSelectedLedgerIds(event.target.checked ? new Set(ledger.map(entry => entry.id)) : new Set())} /> Chọn tất cả</label>
            <div className="flex gap-2">
              {selectedLedgerIds.size > 0 && <button type="button" disabled={actionLoading} onClick={() => void deleteLedgerEntries(Array.from(selectedLedgerIds))} className={`${buttonClass} border-rose-500/30 bg-rose-500/10 text-rose-600`}>Xóa {selectedLedgerIds.size} đã chọn</button>}
              <button type="button" disabled={actionLoading || ledgerLoading || !ledger.length} onClick={() => void deleteLedgerEntries('all')} className={`${buttonClass} border-rose-500/30 bg-rose-500/10 text-rose-600`}>Xóa sạch lịch sử</button>
            </div>
          </div>
          <div className="min-h-32 space-y-2 overflow-y-auto p-3 sm:p-4">
            {ledgerLoading && <p className="p-6 text-center text-xs text-slate-500">Đang tải lịch sử giao dịch...</p>}
            {ledgerError && <p role="alert" className="p-6 text-center text-xs text-rose-500">{ledgerError}</p>}
            {!ledgerLoading && !ledgerError && ledger.length === 0 && <p className="p-8 text-center text-xs text-slate-400">Chưa có giao dịch.</p>}
            {ledger.map(entry => {
              const isSpend = entry.type === 'spend';
              const badge = entry.type === 'earn' ? '+ Thu' : isSpend ? '- Chi' : '👑 Admin';
              return <article key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <input type="checkbox" checked={selectedLedgerIds.has(entry.id)} onChange={event => setSelectedLedgerIds(previous => { const next = new Set(previous); event.target.checked ? next.add(entry.id) : next.delete(entry.id); return next; })} />
                  <span className="shrink-0 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">{badge}</span>
                  <div className="min-w-0"><div className="truncate font-bold">{entry.title || 'Giao dịch'}</div><div className="truncate text-[10px] text-slate-500">{entry.description || ''}</div><div className="mt-0.5 font-mono text-[9px] text-slate-400">{entry.timestamp ? new Date(entry.timestamp).toLocaleString('vi-VN') : 'Giao dịch cũ'}</div></div>
                </div>
                <div className="flex shrink-0 items-center gap-2"><span className={`font-mono font-bold ${isSpend ? 'text-rose-600' : 'text-emerald-600'}`}>{entry.amount === undefined ? '' : `${isSpend ? '-' : '+'}${entry.amount} Vàng`}</span><button type="button" disabled={actionLoading} onClick={() => void deleteLedgerEntries([entry.id])} aria-label="Xóa giao dịch" className="rounded-lg border border-rose-500/20 px-2 py-1 text-rose-500">🗑️</button></div>
              </article>;
            })}
          </div>
        </section>
      </div>}
    </>
  );
}

function Avatar({ user, className }: { user: AdminUser; className: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white dark:bg-slate-800 ${className}`}>
      {avatarIsUrl(user.avatar) && !failed
        ? <img src={user.avatar} alt={user.nickname || 'Avatar'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : user.avatar && !avatarIsUrl(user.avatar) ? user.avatar : '⚔️'}
    </span>
  );
}

function UserActions({ user, self, busy, onEdit, onLedger, onDelete }: {
  user: AdminUser;
  self: boolean;
  busy: boolean;
  onEdit: (user: AdminUser) => void;
  onLedger: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return <div className="flex items-center justify-center gap-1.5">
    <button type="button" onClick={() => onEdit(user)} className="rounded-lg border border-purple-500/20 p-2 text-purple-600 hover:bg-purple-500/10" title="Tinh chỉnh">✏️</button>
    <button type="button" onClick={() => onLedger(user)} className="rounded-lg border border-amber-500/20 p-2 text-amber-600 hover:bg-amber-500/10" title="Xem lịch sử">📜</button>
    {!self && <button type="button" disabled={busy} onClick={() => onDelete(user)} className="rounded-lg border border-rose-500/20 p-2 text-rose-500 hover:bg-rose-500/10" title="Xóa tài khoản">🗑️</button>}
  </div>;
}

function UserRow(props: {
  user: AdminUser;
  self: boolean;
  busy: boolean;
  onEdit: (user: AdminUser) => void;
  onLedger: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  const { user } = props;
  return <tr className="text-slate-800 dark:text-slate-200">
    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar user={user} className="h-8 w-8 rounded-full border border-slate-200 text-xl dark:border-slate-700" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="truncate font-bold">{user.nickname || user.sub}</span>{user.role === 'admin' && <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold text-white">👑 ADMIN</span>}{props.self && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">BẠN</span>}</div><div className="max-w-48 truncate text-[10px] text-slate-400">{user.email || user.sub}</div></div></div></td>
    <td className="px-4 py-3 text-center"><span className="font-mono font-bold text-blue-600">Lv. {user.level || 1}</span><div className="text-[10px] text-slate-400">{user.exp || 0} EXP</div></td>
    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{numberFormat.format(user.coins ?? 0)}</td>
    <td className="px-4 py-3 text-center"><button type="button" onClick={() => props.onLedger(user)} className="text-purple-600 hover:underline">{user.ledgerCount ?? 0} mục</button></td>
    <td className="px-4 py-3 text-center"><span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${user.isCheater ? 'border-rose-500/30 bg-rose-500/15 text-rose-600' : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600'}`}>{user.isCheater ? '⚠️ Gian Lận' : '✅ Hiệp Sĩ'}</span></td>
    <td className="px-4 py-3"><UserActions {...props} /></td>
  </tr>;
}

function UserCard(props: {
  user: AdminUser;
  self: boolean;
  busy: boolean;
  onEdit: (user: AdminUser) => void;
  onLedger: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  const { user } = props;
  return <article className={`${panelClass} p-3`}>
    <div className="mb-3 flex items-center gap-2.5"><Avatar user={user} className="h-10 w-10 rounded-full border border-slate-200 text-xl dark:border-slate-700" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1"><strong className="truncate text-xs">{user.nickname || user.sub}</strong>{user.role === 'admin' && <span className="rounded bg-purple-600 px-1 py-0.5 text-[9px] font-bold text-white">👑 ADMIN</span>}{props.self && <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold">BẠN</span>}</div><div className="truncate text-[10px] text-slate-400">{user.email || user.sub}</div></div><span className="font-mono text-xs font-bold text-blue-600">Lv. {user.level || 1}</span></div>
    <div className="mb-3 grid grid-cols-3 border-y border-slate-200 py-2 text-center dark:border-slate-800"><div><div className="text-[9px] text-slate-400">Vàng</div><div className="font-mono text-xs font-bold text-amber-600">{numberFormat.format(user.coins ?? 0)}</div></div><div className="border-x border-slate-200 dark:border-slate-800"><div className="text-[9px] text-slate-400">Sổ Cái</div><div className="font-mono text-xs font-bold text-purple-600">{user.ledgerCount ?? 0} mục</div></div><div><div className="text-[9px] text-slate-400">Trạng thái</div><div className={`text-[10px] font-bold ${user.isCheater ? 'text-rose-600' : 'text-emerald-600'}`}>{user.isCheater ? '⚠️ Vi phạm' : '✅ Hiệp Sĩ'}</div></div></div>
    <UserActions {...props} />
  </article>;
}
