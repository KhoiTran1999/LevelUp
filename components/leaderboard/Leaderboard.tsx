'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';

type LeaderboardEntry = {
  key: string;
  googleId?: string;
  nickname: string;
  avatar?: string;
  level?: number;
  title?: string;
  role?: string;
  coins?: number;
  totalCoinsEarned?: number;
  isOnline?: boolean;
  lastActive?: number | null;
};

type CheaterEntry = {
  key: string;
  nickname: string;
  avatar?: string;
  title?: string;
  cheatStrikes?: number;
  cheatedAt?: number;
};

type LeaderboardResponse = {
  leaderboard?: LeaderboardEntry[];
  onlineCount?: number;
};

type CheatersResponse = {
  cheaters?: CheaterEntry[];
  count?: number;
};

type ConfirmOptions = {
  title: string;
  message: string;
  detail: string;
  confirmText: string;
  cancelText: string;
  icon: string;
  btnColor: 'rose' | 'purple';
};

declare global {
  interface Window {
    confirmAction?: (options: ConfirmOptions) => Promise<boolean>;
    showToast?: (message: string, type: 'success' | 'error') => void;
  }
}

function formatTimeAgo(timestamp?: number | null): string {
  if (!timestamp) return 'trước đó';
  const diffSeconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSeconds < 60) return 'vừa xong';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}p trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  const date = new Date(Number(timestamp));
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatCheatedAt(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(Number(timestamp))) return 'Gần đây';
  return new Date(timestamp).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function Avatar({
  value,
  nickname,
  size = 'w-8 h-8',
}: {
  value?: string;
  nickname: string;
  size?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const isImage = value && /^(https?:\/\/|data:image\/)/i.test(value);
  if (!isImage || hasError) {
    return (
      <span className={`${size} inline-flex items-center justify-center shrink-0`}>
        {isImage ? '⚔️' : value || '⚔️'}
      </span>
    );
  }

  return (
    <img
      referrerPolicy="no-referrer"
      src={value}
      alt={nickname || 'Avatar'}
      className={`${size} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700`}
      onError={() => setHasError(true)}
    />
  );
}

export function Leaderboard() {
  const { activeTab, state } = useLevelUp();
  const { profile } = state;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [cheaters, setCheaters] = useState<CheaterEntry[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedView, setSelectedView] = useState<'ranking' | 'cheaters'>('ranking');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCheaters, setIsLoadingCheaters] = useState(false);
  const [error, setError] = useState('');
  const [cheatersError, setCheatersError] = useState('');
  const [pendingActionKey, setPendingActionKey] = useState('');

  const isAdmin = profile.role === 'admin';
  const token = profile.sessionToken || profile.googleToken || profile.token;
  const authorizationHeaders = useMemo(
    () => token ? { Authorization: `Bearer ${token}` } : {},
    [token]
  );

  const fetchCheaters = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingCheaters(true);
    setCheatersError('');
    try {
      const response = await fetch('/api/sync?action=cheaters', {
        credentials: 'include',
        signal,
      });
      if (!response.ok) throw new Error(`Không thể tải Sổ Đen (HTTP ${response.status}).`);
      const data = await response.json() as CheatersResponse;
      const list = Array.isArray(data.cheaters) ? data.cheaters : [];
      setCheaters(list);
      return list;
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return null;
      setCheatersError(fetchError instanceof Error ? fetchError.message : 'Không thể tải Sổ Đen.');
      return null;
    } finally {
      setIsLoadingCheaters(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sync?action=leaderboard', {
        headers: authorizationHeaders,
        credentials: 'include',
        signal,
      });
      if (!response.ok) throw new Error(`Không thể tải bảng xếp hạng (HTTP ${response.status}).`);
      const data = await response.json() as LeaderboardResponse;
      setEntries(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setOnlineCount(Number(data.onlineCount) || 0);
      void fetchCheaters(signal);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
      setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải bảng xếp hạng.');
    } finally {
      setIsLoading(false);
    }
  }, [authorizationHeaders, fetchCheaters]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    const controller = new AbortController();
    void fetchLeaderboard(controller.signal);
    return () => controller.abort();
  }, [activeTab, fetchLeaderboard]);

  const isCurrentUser = useCallback((entry: Pick<LeaderboardEntry, 'key' | 'googleId' | 'nickname'>) => (
    Boolean(profile.googleId && (entry.key === profile.googleId || entry.googleId === profile.googleId)) ||
    entry.nickname?.toLowerCase() === profile.nickname?.toLowerCase()
  ), [profile.googleId, profile.nickname]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? entries.filter(entry => (entry.nickname || '').toLocaleLowerCase().includes(query)) : entries;
  }, [entries, search]);

  const confirm = useCallback(async (options: ConfirmOptions) => {
    if (window.confirmAction) return window.confirmAction(options);
    return window.confirm(`${options.title}\n${options.message}`);
  }, []);

  const notify = useCallback((message: string, type: 'success' | 'error') => {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console[type === 'error' ? 'error' : 'info'](message);
    }
  }, []);

  const runAdminAction = useCallback(async (
    action: 'admin_remove' | 'admin_pardon',
    entry: Pick<LeaderboardEntry, 'key' | 'nickname'>,
  ) => {
    const isPardon = action === 'admin_pardon';
    let accepted: boolean;
    try {
      accepted = await confirm({
        title: isPardon ? 'Ân Xá Tài Khoản Gian Lận' : 'Xóa Tài Khoản Bảng Xếp Hạng',
        message: isPardon
          ? `Bạn có muốn ân xá cho hiệp sĩ "${entry.nickname}" không?`
          : `Xóa tài khoản "${entry.nickname}" khỏi Bảng Xếp Hạng?`,
        detail: isPardon
          ? 'Tài khoản sẽ được xóa trạng thái Kẻ Gian Lận và được phép xuất hiện lại trên Bảng Xếp Hạng.'
          : 'Hành động này có hiệu lực ngay lập tức.',
        confirmText: isPardon ? 'Ân Xá Ngay' : 'Xóa Vĩnh Viễn',
        cancelText: 'Hủy',
        icon: isPardon ? '🕊️' : '🗑️',
        btnColor: isPardon ? 'purple' : 'rose',
      });
    } catch (confirmError) {
      notify(confirmError instanceof Error ? confirmError.message : 'Không thể mở hộp thoại xác nhận.', 'error');
      return;
    }
    if (!accepted) return;

    setPendingActionKey(`${action}:${entry.key}`);
    try {
      const response = await fetch(`/api/sync?action=${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...authorizationHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isPardon ? {} : { nickname: profile.nickname }),
          targetNickname: entry.nickname,
          targetSub: entry.key,
        }),
      });
      const data = await response.json() as { success?: boolean; message?: string; error?: string };
      if (!response.ok || (isPardon && !data.success)) {
        throw new Error(data.error || `Thao tác thất bại (HTTP ${response.status}).`);
      }
      notify(
        isPardon ? data.message || `Đã ân xá cho "${entry.nickname}".` : `Đã xóa "${entry.nickname}" khỏi hệ thống!`,
        'success'
      );
      await fetchLeaderboard();
    } catch (actionError) {
      notify(actionError instanceof Error ? actionError.message : 'Không thể thực hiện thao tác.', 'error');
    } finally {
      setPendingActionKey('');
    }
  }, [authorizationHeaders, confirm, fetchLeaderboard, notify, profile.nickname]);

  const isVisible = activeTab === 'leaderboard';
  const topThree = entries.slice(0, 3);

  return (
    <section id="tab-leaderboard" className={`tab-pane ${isVisible ? 'block' : 'hidden'}`}>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🏆</span>
            <h2 className="font-rpg-title font-extrabold text-lg sm:text-2xl text-yellow-600 dark:text-yellow-400 tracking-tight">
              BẢNG XẾP HẠNG THÀNH VIÊN
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Những hiệp sĩ chăm chỉ với số Vàng hiện có nhiều nhất (Đồng bộ trực tuyến).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{onlineCount.toLocaleString('vi-VN')}</span>&nbsp;đang online
          </div>
          <button
            type="button"
            onClick={() => void fetchLeaderboard()}
            disabled={isLoading}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 border border-slate-200 dark:border-slate-800 transition flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
            title="Cập nhật bảng xếp hạng"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="horizontal-scroll-drag flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none">
          <button
            type="button"
            onClick={() => setSelectedView('ranking')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              selectedView === 'ranking'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-sm shadow-yellow-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>🏆</span><span>Bảng Hiệp Sĩ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedView('cheaters');
              void fetchCheaters();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              selectedView === 'cheaters'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>⚠️</span><span>Sổ Đen Vi Phạm</span>
            {cheaters.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono leading-none">
                {cheaters.length}
              </span>
            )}
          </button>
        </div>
        <label className="relative w-full sm:w-60">
          <span className="sr-only">Tìm kiếm hiệp sĩ</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm kiếm hiệp sĩ..."
            className="w-full px-3 py-1.5 pl-8 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-400 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
        </label>
      </div>

      {selectedView === 'ranking' ? (
        <div className="space-y-3 sm:space-y-4">
          {entries.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5 items-end" data-testid="leaderboard-podium">
              {[1, 0, 2].map((index, position) => {
                const entry = topThree[index];
                if (!entry) {
                  return <div key={`podium-empty-${position}`} className={position === 0 ? 'order-1' : 'order-3'} />;
                }
                const rank = index + 1;
                const mine = isCurrentUser(entry);
                const coins = mine ? profile.coins : entry.coins ?? entry.totalCoinsEarned ?? 0;
                const isChampion = rank === 1;
                const rankStyle = rank === 1
                  ? 'order-2 p-2.5 sm:p-5 -mt-2 sm:-mt-4'
                  : rank === 2
                    ? 'order-1 p-2 sm:p-3.5'
                    : 'order-3 p-2 sm:p-3.5';
                return (
                  <div
                    key={entry.key}
                    className={`flex flex-col items-center text-center rounded-2xl rpg-panel leaderboard-podium-card relative ${rankStyle}`}
                  >
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-black whitespace-nowrap ${
                      isChampion
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}>
                      {isChampion ? '👑 #1 QUÁN QUÂN' : rank === 2 ? '🥈 #2' : '🥉 #3'}
                    </span>
                    <div className="mt-2.5 mb-1.5 relative">
                      <Avatar
                        value={entry.avatar}
                        nickname={entry.nickname}
                        size={isChampion ? 'w-11 h-11 sm:w-15 sm:h-15' : 'w-9 h-9 sm:w-12 sm:h-12'}
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        mine || entry.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400/60'
                      }`} />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-full" title={entry.nickname}>
                      {entry.nickname}
                    </span>
                    <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
                      <span className="font-mono font-semibold">Lv.{entry.level || 1}</span>
                      <span className="hidden md:inline"> • {entry.title || 'Hiệp Sĩ'}</span>
                    </span>
                    <span className="mt-1.5 font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      <span className="inline-flex items-center gap-1">
                        <img src="/coin.svg" alt="" className="w-4 h-4" />
                        {coins.toLocaleString('vi-VN')}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rpg-panel rounded-2xl p-2 sm:p-4 overflow-hidden shadow-sm">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-[10px] sm:text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-slate-200/80 dark:border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center sm:text-left whitespace-nowrap w-12 sm:w-16">Hạng</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 whitespace-nowrap">Hiệp Sĩ</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 hidden sm:table-cell whitespace-nowrap">Danh hiệu</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center hidden sm:table-cell whitespace-nowrap">Cấp độ</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap">Vàng Hiện Có</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {isLoading && entries.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-xs">Đang tải bảng xếp hạng...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={5} className="text-center py-8 text-rose-500 text-xs">{error}</td></tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                        {entries.length === 0
                          ? 'Chưa có ai trên Bảng Xếp Hạng. Hãy đồng bộ tên của bạn để là người đầu tiên!'
                          : 'Không tìm thấy hiệp sĩ phù hợp.'}
                      </td>
                    </tr>
                  ) : filteredEntries.map(entry => {
                    const mine = isCurrentUser(entry);
                    const coins = mine ? profile.coins : entry.coins ?? entry.totalCoinsEarned ?? 0;
                    const rankIndex = entries.indexOf(entry);
                    return (
                      <tr key={entry.key} className={`hover:bg-yellow-500/5 transition ${mine ? 'bg-yellow-500/10' : ''}`}>
                        <td className={`py-2.5 sm:py-3 px-2 sm:px-4 text-center sm:text-left font-mono whitespace-nowrap ${
                          rankIndex < 3 ? 'text-base sm:text-lg' : 'text-slate-500 text-xs sm:text-sm'
                        }`}>
                          {rankIndex === 0 ? '🥇' : rankIndex === 1 ? '🥈' : rankIndex === 2 ? '🥉' : `#${rankIndex + 1}`}
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <span className="relative">
                              <Avatar value={entry.avatar} nickname={entry.nickname} size="w-7 h-7" />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                                mine || entry.isOnline ? 'bg-emerald-500' : 'bg-slate-400/60'
                              }`} />
                            </span>
                            <div className="min-w-0 flex flex-col justify-center">
                              <div className="min-w-0 flex items-center flex-wrap gap-1">
                                <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[110px] sm:max-w-[180px] md:max-w-[240px]">
                                  {entry.nickname}
                                </span>
                                {entry.role === 'admin' && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold whitespace-nowrap">👑 ADMIN</span>
                                )}
                                {mine && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>
                                )}
                                {isAdmin && !mine && (
                                  <button
                                    type="button"
                                    disabled={pendingActionKey === `admin_remove:${entry.key}`}
                                    onClick={() => void runAdminAction('admin_remove', entry)}
                                    className="text-rose-500 hover:text-rose-700 ml-1 text-xs disabled:opacity-50"
                                    title="Xóa tài khoản này (Quyền Admin)"
                                    aria-label={`Xóa tài khoản ${entry.nickname}`}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                              <div className="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.{entry.level || 1}</span>
                                <span>•</span><span className="truncate max-w-[100px]">{entry.title || 'Thành viên'}</span>
                              </div>
                              <div className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400">
                                {mine || entry.isOnline
                                  ? <span className="text-emerald-600 dark:text-emerald-400">● Đang online</span>
                                  : `Hoạt động ${formatTimeAgo(entry.lastActive)}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {entry.title || 'Thành viên'}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-300 hidden sm:table-cell whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">Lv. {entry.level || 1}</span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 justify-end">
                            <img src="/coin.svg" alt="" className="w-4 h-4" />
                            {coins.toLocaleString('vi-VN')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rpg-panel rounded-2xl p-2 sm:p-4 overflow-hidden border border-rose-500/20 bg-rose-950/5">
          <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>Danh sách tài khoản can thiệp dữ liệu bị tạm ngừng vinh danh Bảng Xếp Hạng. Cần hoàn thành 5 phiên tập trung hợp lệ hoặc được Quản trị viên mở khóa.</span>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-[10px] sm:text-xs uppercase text-slate-400 dark:text-slate-500 border-b border-rose-500/20 font-mono">
                <tr>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-4 whitespace-nowrap">Hiệp Sĩ Vi Phạm</th>
                  <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 hidden sm:table-cell">Trạng thái / Danh hiệu</th>
                  <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center hidden sm:table-cell">Số lần vi phạm</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">Thời gian</th>
                  {isAdmin && <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10 dark:divide-slate-800/60 font-medium">
                {isLoadingCheaters ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-500 text-xs">Đang tải danh sách vi phạm...</td></tr>
                ) : cheatersError ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-rose-500 text-xs">{cheatersError}</td></tr>
                ) : cheaters.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-500 text-xs font-medium">🕊️ Không có tài khoản nào trong Sổ Đen. Toàn thể hiệp sĩ đều giữ vững kỷ luật và danh dự!</td></tr>
                ) : cheaters.map(entry => {
                  const mine = Boolean(profile.googleId && entry.key === profile.googleId) ||
                    entry.nickname?.toLowerCase() === profile.nickname?.toLowerCase();
                  return (
                  <tr key={entry.key} className={`hover:bg-rose-500/5 transition ${mine ? 'bg-rose-500/10 font-bold' : ''}`}>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <Avatar value={entry.avatar} nickname={entry.nickname} size="w-7 h-7" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-[190px]">{entry.nickname}</span>
                            {mine && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold whitespace-nowrap">BẠN</span>}
                          </div>
                          <div className="sm:hidden text-[10px] text-rose-500/90 font-mono mt-0.5">
                            {entry.cheatStrikes || 1} lần vi phạm • {formatCheatedAt(entry.cheatedAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs whitespace-nowrap hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {entry.title || 'Kẻ Gian Lận ⚠️'}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs font-bold text-rose-500 whitespace-nowrap hidden sm:table-cell">
                      {entry.cheatStrikes || 1} lần
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatCheatedAt(entry.cheatedAt)}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={pendingActionKey === `admin_pardon:${entry.key}`}
                          onClick={() => void runAdminAction('admin_pardon', entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <span>🕊️</span><span>Ân Xá</span>
                        </button>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
