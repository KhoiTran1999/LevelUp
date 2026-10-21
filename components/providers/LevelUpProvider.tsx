'use client';

import React, { createContext, useContext, useState, useEffect, useOptimistic, useTransition, useCallback, useRef } from 'react';
import type {
  LevelUpAppState,
  Quest,
  TabType,
  UserProfile,
  ActiveTimer,
  ShopItem,
  InventoryItem,
  LedgerEntry,
  NoteItem,
  ViewerProofData,
  ProofSubmissionPayload,
  ProofVerificationResult,
  BankLoan,
  BankDepositItem,
  ProofPhotoItem,
} from '@/types/levelup';
import { getAllProofPhotos } from '@/components/ledger/ledger-utils';
import { soundFX } from '@/lib/audio/sound-effects';

function notifyBankToast(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  if (typeof window !== 'undefined') {
    (window as unknown as { showToast?: (m: string, t: string) => void }).showToast?.(msg, type);
  }
}

// ponytail: Fast array deduplicator by unique id for React keys & DB integrity. Upgrade path: database PK.
function dedupeById<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item && item.id) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    } else if (item) {
      result.push(item);
    }
  }
  return result;
}

function isNoteItem(value: unknown): value is NoteItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'content' in value &&
    'createdAt' in value &&
    'updatedAt' in value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

const TAB_TYPES: TabType[] = ['quests', 'shop', 'notes', 'bank', 'leaderboard', 'ledger', 'tracker', 'admin'];

function getTabFromHash(hash: string): TabType | null {
  const tab = hash.replace(/^#/, '');
  return TAB_TYPES.includes(tab as TabType) ? (tab as TabType) : null;
}

const INITIAL_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'shop_seed_1',
    name: '1 Ly Trà Sữa / Cà Phê Yêu Thích',
    description: 'Tự thưởng một cốc đồ uống ngon lành sau buổi học tập, làm việc',
    price: 35,
    tier: 'rare',
    icon: '🧋',
    targetMinutes: 0,
    history: {},
    verdict: 'Tương đương hơn 1 tiếng tập trung làm việc. Hãy thưởng thức thật ngon miệng!',
  },
  {
    id: 'shop_seed_2',
    name: 'Lướt Mạng Xã Hội / Xem Video 30 Phút',
    description: 'Giải trí thư giãn thoải mái sau khi hoàn thành mục tiêu',
    price: 20,
    tier: 'common',
    icon: '📱',
    targetMinutes: 30,
    history: {},
    verdict: 'Thư giãn hợp lý giúp nạp lại năng lượng cho những mục tiêu tiếp theo.',
  },
  {
    id: 'shop_seed_3',
    name: 'Đi Xem Phim Rạp Cuối Tuần',
    description: 'Một buổi tối thư giãn trọn vẹn tại rạp chiếu phim',
    price: 120,
    tier: 'epic',
    icon: '🍿',
    targetMinutes: 120,
    history: {},
    verdict: 'Mục tiêu lớn! Cần hoàn thành đều đặn nhiệm vụ cả tuần để đổi lấy món quà này.',
  },
];

const INITIAL_PROFILE: UserProfile = {
  nickname: 'Hiệp Sĩ',
  avatar: '⚔️',
  level: 1,
  exp: 0,
  coins: 20,
  totalCoinsEarned: 20,
  totalCoinsSpent: 0,
  totalFocusSessions: 0,
  title: 'Tân Binh Cấp 1',
  streak: 1,
  lastStreakDate: '',
  streakHistory: [],
  soundEnabled: true,
  theme: 'light',
  role: 'adventurer',
  bank: {
    deposited: 0,
    depositInterest: 0,
    lastDepositAt: 0,
    loan: null,
    isFrozen: false,
  },
};

const INITIAL_QUESTS: Quest[] = [
  {
    id: 'q_seed_1',
    title: 'Đọc 1 chương sách chuyên ngành',
    description: 'Ghi chú ít nhất 3 ý chính, không dùng điện thoại',
    type: 'focus',
    rank: 'C',
    rewardCoins: 12,
    targetMinutes: 25,
    icon: '📖',
    advice: 'Bật chế độ Không làm phiền trên điện thoại trước khi bấm giờ.',
    verdict: '25 phút tập trung sâu là khoảng thời gian chuẩn mực. Hãy hoàn thành đủ giờ để nhận thưởng!',
    isRepeatable: true,
    completedCount: 0,
    status: 'active',
    createdAt: 1700000000000,
  },
  {
    id: 'q_seed_2',
    title: 'Dọn sạch góc bàn làm việc & rửa sạch cốc',
    description: 'Không gian ngăn nắp giúp tinh thần thoải mái và tập trung tốt hơn',
    type: 'bounty',
    rank: 'E',
    rewardCoins: 5,
    targetMinutes: 0,
    icon: '🧹',
    advice: 'Làm dứt khoát trong 5 - 10 phút.',
    verdict: 'Công việc nhanh gọn có kết quả rõ ràng. Đánh dấu xong để nhận ngay 5 Vàng!',
    isRepeatable: false,
    completedCount: 0,
    status: 'active',
    createdAt: 1700000000000,
  },
];

const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note_seed_1',
    title: 'Kế Hoạch & Mục Tiêu',
    topic: 'Kế Hoạch',
    content:
      '<h2>🎯 Kế Hoạch Tuần Này</h2><p>Không gian ghi chép tự do của bạn. Bạn có thể tự do đặt tên chủ đề tùy ý!</p><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Hoàn thành 3 phiên Pomodoro hôm nay</span></div><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Đọc 1 chương tài liệu chuyên ngành</span></div><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Ghi chú lại ý tưởng sáng tạo</span></div>',
    isPinned: true,
    pinned: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

interface LevelUpContextType {
  state: LevelUpAppState;
  optimisticProfile: UserProfile;
  optimisticQuests: Quest[];
  optimisticInventory: InventoryItem[];
  optimisticNotes: NoteItem[];
  activeNoteId: string | null;
  activeTab: TabType;
  isSyncing: boolean;
  setActiveTab: (tab: TabType) => void;
  // Quest Actions
  completeQuest: (questId: string, skipProofCheck?: boolean) => Promise<void>;
  addQuest: (quest: Partial<Quest>) => void;
  deleteQuest: (questId: string) => void;
  // Quest Proof Actions & Modals
  activeProofQuest: Quest | null;
  pendingApprovedQuest: Quest | null;
  viewerProofData: ViewerProofData | null;
  isProofModalOpen: boolean;
  isProofApprovedModalOpen: boolean;
  isProofViewerModalOpen: boolean;
  openProofModal: (quest: Quest) => void;
  closeProofModal: () => void;
  submitProof: (payload: ProofSubmissionPayload) => Promise<ProofVerificationResult>;
  claimApprovedProof: () => void;
  closeProofApprovedModal: () => void;
  openProofViewer: (data: ViewerProofData) => void;
  closeProofViewer: () => void;
  // Quest & Reward Setup Modals
  isQuestModalOpen: boolean;
  isRewardModalOpen: boolean;
  editingQuest: Quest | null;
  editingReward: ShopItem | null;
  openQuestModal: (questToEdit?: Quest) => void;
  closeQuestModal: () => void;
  openRewardModal: (rewardToEdit?: ShopItem) => void;
  closeRewardModal: () => void;
  // Bank Modals & Actions
  isBankWithdrawModalOpen: boolean;
  isBankRulesModalOpen: boolean;
  isCreditLimitModalOpen: boolean;
  selectedWithdrawDepositId: string | null;
  openBankWithdrawModal: (depositId?: string) => void;
  closeBankWithdrawModal: () => void;
  openBankRulesModal: (sectionId?: string) => void;
  closeBankRulesModal: () => void;
  openCreditLimitModal: () => void;
  closeCreditLimitModal: () => void;
  executeBankDeposit: (amount: number, termDays: number) => Promise<boolean>;
  executeBankWithdraw: (amount?: number, depositId?: string) => Promise<boolean>;
  executeBankBorrow: (amount: number, termDays: number, autoDeductPercent: number) => Promise<boolean>;
  executeBankRepay: (amount?: number) => Promise<boolean>;
  loadBankState: () => Promise<void>;
  // Shop Actions
  buyShopItem: (item: ShopItem) => Promise<boolean>;
  useInventoryItem: (invId: string) => Promise<void>;
  refundInventoryItem: (invId: string) => Promise<void>;
  undoUseInventoryItem: (invId: string) => Promise<void>;
  addShopItem: (item: Partial<ShopItem>) => void;
  deleteShopItem: (itemId: string) => void;
  // Note Actions
  setActiveNoteId: (id: string) => void;
  createNote: (defaultTopic?: string) => string;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => Promise<boolean>;
  togglePinNote: (id: string) => void;
  // Global System Actions
  toggleTheme: () => void;
  toggleSound: () => void;
  togglePalette: (paletteName?: string) => void;
  startFocusTimer: (quest: Quest) => void;
  startRewardTimer: (item: InventoryItem) => void;
  startBreakTimer: (minutes?: number) => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  holdFocusTimer: () => void;
  resetFocusTimer: () => void;
  adjustFocusTimer: (deltaSeconds: number) => void;
  setFocusTimerRemaining: (seconds: number) => void;
}

type InventoryOptimisticAction =
  | { type: 'buy'; item: InventoryItem }
  | { type: 'use'; id: string }
  | { type: 'refund'; id: string }
  | { type: 'undo'; id: string };

type NotesOptimisticAction =
  | { type: 'create'; note: NoteItem }
  | { type: 'update'; id: string; updates: Partial<NoteItem> }
  | { type: 'delete'; id: string }
  | { type: 'togglePin'; id: string };

const LevelUpContext = createContext<LevelUpContextType | null>(null);

export function LevelUpProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LevelUpAppState>({
    profile: INITIAL_PROFILE,
    focusNotes: '',
    notes: [],
    activeNoteId: '',
    quests: [],
    shopItems: [],
    inventory: [],
    completedQuestIds: [],
    proofPhotos: [],
    ledger: [],
    activeTimer: null,
    lastTimerClearedAt: 0,
    lastSyncedAt: 0,
  });

  const [activeTab, setActiveTabState] = useState<TabType>('quests');
  const [isSyncing, setIsSyncing] = useState(false);
  const [startupStatus, setStartupStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [activeProofQuest, setActiveProofQuest] = useState<Quest | null>(null);
  const [pendingApprovedQuest, setPendingApprovedQuest] = useState<Quest | null>(null);
  const [viewerProofData, setViewerProofData] = useState<ViewerProofData | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isProofApprovedModalOpen, setIsProofApprovedModalOpen] = useState(false);
  const [isProofViewerModalOpen, setIsProofViewerModalOpen] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [editingReward, setEditingReward] = useState<ShopItem | null>(null);
  const [isBankWithdrawModalOpen, setIsBankWithdrawModalOpen] = useState(false);
  const [isBankRulesModalOpen, setIsBankRulesModalOpen] = useState(false);
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState(false);
  const [selectedWithdrawDepositId, setSelectedWithdrawDepositId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // React 19 useOptimistic for immediate user feedback
  const [optimisticProfile, setOptimisticProfile] = useOptimistic(
    state.profile,
    (current, update: Partial<UserProfile>) => ({
      ...current,
      ...update,
    })
  );

  const [optimisticQuests, setOptimisticQuests] = useOptimistic(
    state.quests,
    (current, { questId, status }: { questId: string; status: Quest['status'] }) =>
      current.map(q => (q.id === questId ? { ...q, status } : q))
  );

  const [optimisticInventory, setOptimisticInventory] = useOptimistic(
    state.inventory,
    (current: InventoryItem[], action: InventoryOptimisticAction) => {
      switch (action.type) {
        case 'buy':
          return [action.item, ...current];
        case 'use':
          return current.map(item =>
            item.id === action.id ? { ...item, isUsed: true, usedAt: Date.now() } : item
          );
        case 'refund':
          return current.filter(item => item.id !== action.id);
        case 'undo':
          return current.map(item =>
            item.id === action.id ? { ...item, isUsed: false, usedAt: undefined } : item
          );
        default:
          return current;
      }
    }
  );

  const [optimisticNotes, setOptimisticNotes] = useOptimistic(
    state.notes,
    (current: NoteItem[], action: NotesOptimisticAction) => {
      switch (action.type) {
        case 'create':
          return [action.note, ...current];
        case 'update':
          return current.map(n =>
            n.id === action.id ? { ...n, ...action.updates, updatedAt: Date.now() } : n
          );
        case 'delete':
          return current.filter(n => n.id !== action.id);
        case 'togglePin':
          return current.map(n => {
            if (n.id === action.id) {
              const nextPinned = !(n.pinned ?? n.isPinned);
              return { ...n, pinned: nextPinned, isPinned: nextPinned, updatedAt: Date.now() };
            }
            return n;
          });
        default:
          return current;
      }
    }
  );

  const isHydratedRef = useRef(false);
  const syncDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedHashRef = useRef<string>('');
  const notesBroadcastSourceRef = useRef(
    `react_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  const notesBroadcastRevisionRef = useRef(0);
  const receivedNotesRevisionsRef = useRef(new Map<string, number>());
  const skipNotesBroadcastRef = useRef(false);

  // ponytail: Computes content fingerprint omitting lastSyncedAt to prevent infinite ping-pong sync loop
  const computeStateSyncHash = useCallback((st: LevelUpAppState): string => {
    try {
      return JSON.stringify({
        nickname: st.profile?.nickname,
        coins: st.profile?.coins,
        bank: st.profile?.bank,
        quests: st.quests,
        shopItems: st.shopItems,
        inventory: st.inventory,
        notes: st.notes,
        activeNoteId: st.activeNoteId,
        focusNotes: st.focusNotes,
        ledger: st.ledger,
        proofPhotos: st.proofPhotos,
        completedQuestIds: st.completedQuestIds,
        activeTimer: st.activeTimer
      });
    } catch {
      return '';
    }
  }, []);

  // Directly sync state to Cloud (Redis + Supabase Postgres via /api/sync)
  const syncToCloud = useCallback(async (stateToSync: LevelUpAppState) => {
    const currentHash = computeStateSyncHash(stateToSync);
    if (currentHash && currentHash === lastSyncedHashRef.current) {
      return;
    }
    try {
      setIsSyncing(true);
      const res = await fetch('/api/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: stateToSync.profile?.nickname || 'Hiệp Sĩ',
          state: stateToSync,
        }),
      });
      if (res.ok) {
        lastSyncedHashRef.current = currentHash;
        const data = await res.json().catch(() => ({}));
        if (data.conflict && data.state) {
          // ponytail: Remote state is strictly newer; rehydrate to resolve conflict
          setState(prev => ({
            ...prev,
            ...data.state,
            lastSyncedAt: data.syncedAt || Date.now(),
            lastModified: data.syncedAt || Date.now(),
          }));
        } else if (data.syncedAt) {
          setState(prev => ({ ...prev, lastSyncedAt: data.syncedAt, lastModified: data.syncedAt }));
        }
      }
    } catch (err) {
      console.warn('[Sync Error]', err);
    } finally {
      setIsSyncing(false);
    }
  }, [computeStateSyncHash]);

  const queueSyncToCloud = useCallback(
    (stateToSync: LevelUpAppState, immediate = false) => {
      // ponytail: Stamp fresh lastModified on every mutation so cloud sync never misidentifies client writes as stale
      const now = Date.now();
      const stateWithTimestamp: LevelUpAppState = {
        ...stateToSync,
        lastModified: Math.max(Number(stateToSync.lastModified) || 0, Math.max(now, (Number(stateToSync.lastSyncedAt) || 0) + 1)),
      };

      // Synchronize window.appState for any legacy views
      if (typeof window !== 'undefined') {
        const win = window as unknown as { appState?: LevelUpAppState };
        if (win.appState) {
          Object.assign(win.appState, stateWithTimestamp);
        }
      }

      const currentHash = computeStateSyncHash(stateWithTimestamp);
      if (currentHash && currentHash === lastSyncedHashRef.current) {
        return;
      }

      if (syncDebounceTimerRef.current) {
        clearTimeout(syncDebounceTimerRef.current);
        syncDebounceTimerRef.current = null;
      }

      if (immediate) {
        syncToCloud(stateWithTimestamp);
      } else {
        syncDebounceTimerRef.current = setTimeout(() => {
          syncToCloud(stateWithTimestamp);
        }, 1500);
      }
    },
    [syncToCloud, computeStateSyncHash]
  );

  // Fetch state directly from Redis & Supabase Postgres on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    async function loadCloudState() {
      try {
        setStartupStatus('loading');
        setIsSyncing(true);
        const res = await fetch('/api/sync', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok && res.status !== 401) {
          throw new Error(`State sync failed with status ${res.status}`);
        }
        if (res.ok) {
          const result = await res.json();
          if (result.found && result.data && !isCancelled) {
            const cloudData: LevelUpAppState = result.data;
            setState(prev => {
              const currentTheme: 'light' | 'dark' = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              const mergedProfile = {
                ...prev.profile,
                ...(cloudData.profile || {}),
                theme: currentTheme,
              };

              const notes = Array.isArray(cloudData.notes)
                ? dedupeById(cloudData.notes)
                : dedupeById(prev.notes);
              const activeNoteId = notes.some(note => note.id === cloudData.activeNoteId)
                ? cloudData.activeNoteId
                : notes[0]?.id || '';
              const resolvedState: LevelUpAppState = {
                ...prev,
                ...cloudData,
                profile: mergedProfile,
                quests: Array.isArray(cloudData.quests) ? dedupeById(cloudData.quests) : dedupeById(prev.quests),
                shopItems: Array.isArray(cloudData.shopItems) ? dedupeById(cloudData.shopItems) : dedupeById(prev.shopItems),
                inventory: Array.isArray(cloudData.inventory) ? dedupeById(cloudData.inventory) : dedupeById(prev.inventory),
                notes,
                activeNoteId,
                focusNotes: notes.find(note => note.id === activeNoteId)?.content || '',
                ledger: Array.isArray(cloudData.ledger) ? dedupeById(cloudData.ledger) : dedupeById(prev.ledger),
                proofPhotos: Array.isArray(cloudData.proofPhotos) ? dedupeById(cloudData.proofPhotos) : dedupeById(prev.proofPhotos),
                completedQuestIds: Array.isArray(cloudData.completedQuestIds) ? cloudData.completedQuestIds : prev.completedQuestIds,
                activeTimer: cloudData.activeTimer !== undefined ? cloudData.activeTimer : prev.activeTimer,
                lastSyncedAt: result.syncedAt || cloudData.lastSyncedAt || Date.now(),
              };

              const win = window as unknown as { appState?: LevelUpAppState };
              if (win.appState) {
                Object.assign(win.appState, resolvedState);
              }

              lastSyncedHashRef.current = computeStateSyncHash(resolvedState);
              return resolvedState;
            });
          }
        }
        if (!isCancelled) {
          setStartupStatus('ready');
          isHydratedRef.current = true;
        }
      } catch (err) {
        console.warn('[LevelUpProvider] Failed to fetch state from /api/sync:', err);
        if (!isCancelled) setStartupStatus('error');
      } finally {
        if (!isCancelled) {
          setIsSyncing(false);
        }
      }
    }

    loadCloudState();

    // Listen to vanilla appState sync if legacy app.js updates it
    const handleStateUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<LevelUpAppState>;
      if (customEvent.detail) {
        setState(prev => {
          // ponytail: Direct assignment of deduplicated incoming array honors deletions and empty arrays without resurrecting dead items
          const nextQuests = Array.isArray(customEvent.detail.quests)
            ? dedupeById(customEvent.detail.quests)
            : prev.quests;

          const nextShop = Array.isArray(customEvent.detail.shopItems)
            ? dedupeById(customEvent.detail.shopItems)
            : prev.shopItems;

          const next = {
            ...prev,
            ...customEvent.detail,
            quests: nextQuests,
            shopItems: nextShop,
            inventory: Array.isArray(customEvent.detail.inventory) ? dedupeById(customEvent.detail.inventory) : prev.inventory,
            notes: prev.notes,
            activeNoteId: prev.activeNoteId,
            focusNotes: prev.focusNotes,
          };
          return next;
        });
      }
    };

    // Listen to custom notes update events
    const handleNotesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ notes: NoteItem[]; activeNoteId?: string }>;
      if (customEvent.detail?.notes) {
        const notes = dedupeById(customEvent.detail.notes);
        const requestedActiveNoteId = customEvent.detail.activeNoteId;
        setState(prev => {
          const activeNoteId = requestedActiveNoteId && notes.some(note => note.id === requestedActiveNoteId)
            ? requestedActiveNoteId
            : notes.some(note => note.id === prev.activeNoteId)
              ? prev.activeNoteId
              : notes[0]?.id || '';
          const next = {
            ...prev,
            notes,
            activeNoteId,
            focusNotes: notes.find(note => note.id === activeNoteId)?.content || '',
          };
          return next;
        });
      }
    };

    // BroadcastChannel sync across tabs and extension
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('levelup_sync_channel');
      ch.onmessage = event => {
        const message = event.data;
        if (
          message?.type !== 'NOTES_UPDATED' ||
          !Array.isArray(message.notes) ||
          typeof message.sourceId !== 'string' ||
          !Number.isInteger(message.revision) ||
          message.sourceId === notesBroadcastSourceRef.current
        ) {
          return;
        }

        const lastRevision = receivedNotesRevisionsRef.current.get(message.sourceId) || 0;
        if (message.revision <= lastRevision) return;
        receivedNotesRevisionsRef.current.set(message.sourceId, message.revision);

        const incomingNotes: unknown[] = message.notes;
        const seenNoteIds = new Set<string>();
        const notes: NoteItem[] = [];
        for (const note of incomingNotes) {
          if (!isNoteItem(note) || seenNoteIds.has(note.id)) continue;
          seenNoteIds.add(note.id);
          notes.push(note);
        }
        skipNotesBroadcastRef.current = true;
        setState(prev => {
          const activeNoteId = notes.some(note => note.id === message.activeNoteId)
            ? message.activeNoteId
            : notes[0]?.id || '';
          const activeNote = notes.find(note => note.id === activeNoteId);
          return {
            ...prev,
            notes,
            activeNoteId,
            focusNotes: activeNote?.content || '',
          };
        });
      };
    } catch (_) {}

    window.addEventListener('levelup:state-updated', handleStateUpdate);
    window.addEventListener('levelup:notes-updated', handleNotesUpdate);
    return () => {
      isCancelled = true;
      window.removeEventListener('levelup:state-updated', handleStateUpdate);
      window.removeEventListener('levelup:notes-updated', handleNotesUpdate);
      if (ch) ch.close();
    };
  }, [startupAttempt]);

  // Auto-persist state to Redis & Supabase Postgres on state changes after hydration
  useEffect(() => {
    if (!isHydratedRef.current) return;
    queueSyncToCloud(state);
  }, [state, queueSyncToCloud]);

  useEffect(() => {
    if (!isHydratedRef.current || typeof window === 'undefined') return;

    const win = window as unknown as {
      appState?: LevelUpAppState;
      triggerSave?: (needsCloud?: boolean, immediate?: boolean, timerAction?: unknown, skipFullRender?: boolean) => void;
    };
    if (!win.appState) return;

    const activeNote = state.notes.find(note => note.id === state.activeNoteId);
    Object.assign(win.appState, {
      notes: state.notes,
      activeNoteId: state.activeNoteId,
      focusNotes: activeNote?.content || '',
    });
    win.triggerSave?.(false, false, null, true);
  }, [state.notes, state.activeNoteId]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    if (skipNotesBroadcastRef.current) {
      skipNotesBroadcastRef.current = false;
      return;
    }

    try {
      const ch = new BroadcastChannel('levelup_sync_channel');
      ch.postMessage({
        type: 'NOTES_UPDATED',
        source: 'react_levelup_provider',
        sourceId: notesBroadcastSourceRef.current,
        revision: ++notesBroadcastRevisionRef.current,
        notes: state.notes,
        activeNoteId: state.activeNoteId,
      });
      ch.close();
    } catch (error) {
      console.warn('[Notes Sync Error]', error);
    }
  }, [state.notes, state.activeNoteId]);

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);

    if (typeof window !== 'undefined' && window.location.hash !== `#${tab}`) {
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${tab}`);
    }

    // Synchronize tab panels in DOM (both React & legacy sections)
    if (typeof document !== 'undefined') {
      const allTabs = document.querySelectorAll('.tab-pane');
      allTabs.forEach(pane => {
        if (pane.id === `tab-${tab}`) {
          pane.classList.remove('hidden');
          pane.classList.add('block');
        } else {
          pane.classList.add('hidden');
          pane.classList.remove('block');
        }
      });

      const navButtons = document.querySelectorAll('.nav-tab');
      navButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }, [queueSyncToCloud]);

  useEffect(() => {
    const syncTabFromHash = () => {
      const tab = getTabFromHash(window.location.hash);
      if (tab) setActiveTab(tab);
    };

    if (typeof window !== 'undefined') {
      (window as unknown as { __syncReactActiveTab?: (tab: string) => void }).__syncReactActiveTab = (tab: string) => {
        const parsed = getTabFromHash(`#${tab}`);
        if (parsed) setActiveTabState(parsed);
      };
      (window as unknown as { setActiveTab?: (tab: TabType) => void }).setActiveTab = setActiveTab;
    }

    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash);
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __syncReactActiveTab?: (tab: string) => void }).__syncReactActiveTab;
        delete (window as unknown as { setActiveTab?: (tab: TabType) => void }).setActiveTab;
      }
    };
  }, [setActiveTab]);

  // ponytail: Delta-time countdown runner with native WakeLock & MediaSession synchronization. Upgrade path: Service Worker timer offloading.
  useEffect(() => {
    if (state.activeTimer?.status !== 'running') {
      return;
    }

    let wakeLockSentinel: WakeLockSentinel | null = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => {
        wakeLockSentinel = wl;
      }).catch(() => {});
    }

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTick) / 1000;
      lastTick = now;

      setState(prev => {
        if (!prev.activeTimer || prev.activeTimer.status !== 'running') {
          return prev;
        }

        const nextRemaining = Math.max(0, prev.activeTimer.remainingSeconds - elapsed);
        if (nextRemaining <= 0) {
          if (prev.profile.soundEnabled) {
            soundFX.playFanfare();
          }
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([500, 200, 500, 200, 800]);
            } catch (_) {}
          }
          if (typeof window !== 'undefined') {
            const completedQuest = prev.quests.find(q => q.id === prev.activeTimer?.questId) || {
              id: prev.activeTimer?.questId || 'quest_completed',
              title: prev.activeTimer?.questTitle || 'Phiên tập trung',
              rewardCoins: prev.activeTimer?.questCoins || 10,
              rank: prev.activeTimer?.questRank || 'C',
            };
            window.dispatchEvent(new CustomEvent('levelup:focus-complete', { detail: completedQuest }));
          }

          return {
            ...prev,
            activeTimer: null,
            lastTimerClearedAt: Date.now(),
          };
        }

        // Synchronize DOM timer displays for any legacy elements
        if (typeof document !== 'undefined') {
          const mins = Math.floor(nextRemaining / 60);
          const secs = Math.floor(nextRemaining % 60);
          const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          const zenDisplay = document.getElementById('zen-timer-display');
          if (zenDisplay) zenDisplay.textContent = timeStr;
          const bannerDisplay = document.getElementById('timer-display');
          if (bannerDisplay) bannerDisplay.textContent = timeStr;
        }

        return {
          ...prev,
          activeTimer: {
            ...prev.activeTimer,
            remainingSeconds: nextRemaining,
          },
        };
      });
    }, 500);

    return () => {
      clearInterval(interval);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [state.activeTimer?.status]);

  const toggleTheme = useCallback(() => {
    const nextTheme = state.profile.theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('levelup_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('levelup_theme', 'light');
    }

    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, theme: nextTheme },
    }));
  }, [state.profile.theme]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const nextSound = !prev.profile.soundEnabled;
      return {
        ...prev,
        profile: { ...prev.profile, soundEnabled: nextSound },
      };
    });
  }, []);

  const togglePalette = useCallback((paletteName?: string) => {
    const palettes = ['modern-indigo', 'cyberpunk-neon', 'emerald-realm', 'sunset-orange', 'crimson-valkyrie'];
    const currentPalette = document.documentElement.dataset.palette || 'modern-indigo';
    let nextPalette = paletteName;
    if (!nextPalette) {
      const currentIndex = palettes.indexOf(currentPalette);
      nextPalette = palettes[(currentIndex + 1) % palettes.length];
    }

    if (nextPalette === 'modern-indigo') {
      delete document.documentElement.dataset.palette;
      localStorage.removeItem('levelup_theme_palette');
    } else {
      document.documentElement.dataset.palette = nextPalette;
      localStorage.setItem('levelup_theme_palette', nextPalette);
    }
  }, [queueSyncToCloud]);

  const openProofModal = useCallback((quest: Quest) => {
    setActiveProofQuest(quest);
    setIsProofModalOpen(true);
  }, []);

  const closeProofModal = useCallback(() => {
    setIsProofModalOpen(false);
    setActiveProofQuest(null);
  }, []);

  const openProofViewer = useCallback((data: ViewerProofData) => {
    setViewerProofData(data);
    setIsProofViewerModalOpen(true);
  }, []);

  const closeProofViewer = useCallback(() => {
    setIsProofViewerModalOpen(false);
    setViewerProofData(null);
  }, []);

  const closeProofApprovedModal = useCallback(() => {
    setIsProofApprovedModalOpen(false);
    setPendingApprovedQuest(null);
  }, []);

  const submitProof = useCallback(
    async (payload: ProofSubmissionPayload): Promise<ProofVerificationResult> => {
      const quest = state.quests.find(q => q.id === payload.questId) || activeProofQuest;
      if (!quest) {
        throw new Error('Không tìm thấy thông tin nhiệm vụ.');
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify_proof',
          payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Lỗi kết nối AI');
      }

      const data: ProofVerificationResult = await res.json();
      if (data.approved) {
        const updatedQuest: Quest = {
          ...quest,
          _proofVerified: true,
          proofUserNote: payload.userNote || payload.workContent || '',
          proofFeedback: data.feedback || '',
          proofImageUrl: data.proofImageUrl || quest.proofImageUrl,
        };

        setPendingApprovedQuest(updatedQuest);

        if (data.proofImageUrl) {
          const newPhotoItem = {
            id: `proof_${Date.now()}`,
            questId: quest.id,
            questTitle: quest.title,
            proofImageUrl: data.proofImageUrl,
            photoUrl: data.proofImageUrl,
            rewardCoins: quest.rewardCoins || 10,
            userNote: payload.userNote || payload.workContent || '',
            feedback: data.feedback || '',
            timestamp: Date.now(),
            createdAt: Date.now(),
          };

          setState(prev => ({
            ...prev,
            proofPhotos: [newPhotoItem, ...prev.proofPhotos.slice(0, 99)],
          }));
        }

        setIsProofModalOpen(false);
        setIsProofApprovedModalOpen(true);

        soundFX.playFanfare();
      } else {
        soundFX.playGong();
      }

      return data;
    },
    [state.quests, activeProofQuest]
  );

  const completeQuest = useCallback(
    async (questId: string, skipProofCheck = false) => {
      const quest = state.quests.find(q => q.id === questId);
      if (!quest || quest.status === 'completed') return;

      // If proof is required and not yet verified, open proof modal
      if (!skipProofCheck && quest.requiresProof && !quest._proofVerified) {
        setActiveProofQuest(quest);
        setIsProofModalOpen(true);
        return;
      }

      const rewardCoins = quest.rewardCoins || 5;
      let netCoins = rewardCoins;
      let deductedForLoan = 0;
      let principalDeducted = 0;
      let updatedLoan: BankLoan | null = state.profile.bank?.loan ? { ...state.profile.bank.loan } : null;

      if (updatedLoan && (updatedLoan.debt || 0) > 0) {
        const isOverdue = Boolean(updatedLoan.isOverdue || state.profile.bank?.isFrozen);
        const deductRate = isOverdue ? 1.0 : Math.min(0.8, Math.max(0.2, updatedLoan.autoDeductPercent || 0.5));
        deductedForLoan = Math.min(updatedLoan.debt, Math.floor(rewardCoins * deductRate));
        if (deductedForLoan > 0) {
          const prevPrincipal = updatedLoan.principal || 0;
          principalDeducted = Math.min(prevPrincipal, deductedForLoan);
          updatedLoan.debt -= deductedForLoan;
          updatedLoan.principal = Math.max(0, prevPrincipal - principalDeducted);
          netCoins = rewardCoins - deductedForLoan;
          if (updatedLoan.debt <= 0) {
            updatedLoan = null;
          }
        }
      }

      // Optimistic update using React 19 startTransition
      startTransition(() => {
        setOptimisticProfile({
          coins: state.profile.coins + netCoins,
          totalCoinsEarned: state.profile.totalCoinsEarned + rewardCoins,
        });
        setOptimisticQuests({ questId, status: 'completed' });
      });

      // Dispatch event to play sound & confetti if available
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('levelup:quest-completed', { detail: { quest } }));
      }

      // Record in ledger
      const newLedgerEntry: LedgerEntry = {
        id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'earn',
        category: 'quest',
        amount: rewardCoins,
        title: `Hoàn thành: ${quest.title}`,
        description: `Nhiệm vụ ${quest.type === 'focus' ? 'Tập trung' : 'Làm ngay'} · Hạng ${quest.rank || 'C'}${deductedForLoan > 0 ? ` [🏦 Trích trả nợ: -${deductedForLoan} Vàng]` : ''}`,
        timestamp: Date.now(),
      };

      const ledgerEntries: LedgerEntry[] = [newLedgerEntry];
      if (deductedForLoan > 0) {
        ledgerEntries.push({
          id: `ledger_deduct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'spend',
          category: 'bank_deduct',
          amount: deductedForLoan,
          title: `Trích nợ tự động: ${quest.title}`,
          description: `Đã trích ${deductedForLoan} Vàng (${principalDeducted} gốc + ${deductedForLoan - principalDeducted} lãi) từ phần thưởng "${quest.title}".${!updatedLoan ? ' 🎉 Bạn đã thanh toán sạch nợ!' : ` Dư nợ còn lại: ${updatedLoan.debt} Vàng.`}`,
          timestamp: Date.now(),
        });
      }

      // Persist state update
      setState(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          coins: prev.profile.coins + netCoins,
          totalCoinsEarned: prev.profile.totalCoinsEarned + rewardCoins,
          bank: {
            ...prev.profile.bank,
            loan: updatedLoan,
            isFrozen: updatedLoan ? updatedLoan.isOverdue : false,
          },
        },
        quests: prev.quests.map(q =>
          q.id === questId
            ? {
                ...q,
                status: 'completed' as const,
                completedCount: (q.completedCount || 0) + 1,
                _proofVerified: true,
              }
            : q
        ),
        completedQuestIds: prev.completedQuestIds.includes(questId)
          ? prev.completedQuestIds
          : [...prev.completedQuestIds, questId],
        ledger: [...ledgerEntries, ...prev.ledger],
      }));
    },
    [state.quests, state.profile.coins, state.profile.totalCoinsEarned, setOptimisticProfile, setOptimisticQuests]
  );

  const claimApprovedProof = useCallback(() => {
    if (!pendingApprovedQuest) return;
    const questToClaim = pendingApprovedQuest;
    setPendingApprovedQuest(null);
    setIsProofApprovedModalOpen(false);
    completeQuest(questToClaim.id, true);
  }, [pendingApprovedQuest, completeQuest]);

  const openQuestModal = useCallback((questToEdit?: Quest) => {
    setEditingQuest(questToEdit || null);
    setIsQuestModalOpen(true);
  }, []);

  const closeQuestModal = useCallback(() => {
    setIsQuestModalOpen(false);
    setEditingQuest(null);
  }, []);

  const openRewardModal = useCallback((rewardToEdit?: ShopItem) => {
    setEditingReward(rewardToEdit || null);
    setIsRewardModalOpen(true);
  }, []);

  const closeRewardModal = useCallback(() => {
    setIsRewardModalOpen(false);
    setEditingReward(null);
  }, []);

  // Bank Modals Handlers
  const openBankWithdrawModal = useCallback((depositId?: string) => {
    setSelectedWithdrawDepositId(depositId || null);
    setIsBankWithdrawModalOpen(true);
  }, []);

  const closeBankWithdrawModal = useCallback(() => {
    setIsBankWithdrawModalOpen(false);
    setSelectedWithdrawDepositId(null);
  }, []);

  const openBankRulesModal = useCallback((_sectionId?: string) => {
    setIsBankRulesModalOpen(true);
  }, []);

  const closeBankRulesModal = useCallback(() => {
    setIsBankRulesModalOpen(false);
  }, []);

  const openCreditLimitModal = useCallback(() => {
    setIsCreditLimitModalOpen(true);
  }, []);

  const closeCreditLimitModal = useCallback(() => {
    setIsCreditLimitModalOpen(false);
  }, []);

  // Bank Operations
  const loadBankState = useCallback(async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bank_state' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.bank) {
          setState(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              bank: {
                ...prev.profile.bank,
                ...data.bank,
              },
            },
          }));
        }
      }
    } catch (err) {
      console.warn('loadBankState error:', err);
    }
  }, [queueSyncToCloud]);

  const executeBankDeposit = useCallback(async (amount: number, termDays: number): Promise<boolean> => {
    if (amount <= 0 || amount > state.profile.coins) {
      notifyBankToast('Số dư Vàng không đủ để gửi tiết kiệm!', 'error');
      return false;
    }
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bank_deposit',
          amount,
          termDays,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Lỗi khi gửi tiền');
      }
      const data = await res.json();
      const updatedBank = data.bank || state.profile.bank;
      setState(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          coins: prev.profile.coins - amount,
          bank: updatedBank,
        },
        ledger: [
          {
            id: `ledger_dep_${Date.now()}`,
            type: 'spend',
            category: 'bank_deposit',
            amount,
            title: `Gửi tiết kiệm (${termDays === 0 ? 'Linh hoạt' : `${termDays} ngày`})`,
            description: `Gửi ${amount} Vàng vào Ngân Hàng sinh lãi.`,
            timestamp: Date.now(),
          },
          ...prev.ledger,
        ],
      }));
      notifyBankToast(`Đã gửi thành công ${amount} Vàng vào sổ tiết kiệm!`, 'success');
      return true;
    } catch {
      // Fallback local execution
      const newDepositItem: BankDepositItem = {
        id: `dep_${Date.now()}`,
        amount,
        termDays,
        interest: 0,
        createdAt: Date.now(),
        lastAccruedAt: Date.now(),
        maturityAt: termDays > 0 ? Date.now() + termDays * 24 * 3600 * 1000 : 0,
        status: 'active',
      };
      setState(prev => {
        const currentDeposits = Array.isArray(prev.profile.bank.deposits) ? [...prev.profile.bank.deposits] : [];
        currentDeposits.push(newDepositItem);
        return {
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins - amount,
            bank: {
              ...prev.profile.bank,
              deposited: prev.profile.bank.deposited + amount,
              deposits: currentDeposits,
            },
          },
          ledger: [
            {
              id: `ledger_dep_${Date.now()}`,
              type: 'spend',
              category: 'bank_deposit',
              amount,
              title: `Gửi tiết kiệm (${termDays === 0 ? 'Linh hoạt' : `${termDays} ngày`})`,
              description: `Gửi ${amount} Vàng vào Ngân Hàng sinh lãi.`,
              timestamp: Date.now(),
            },
            ...prev.ledger,
          ],
        };
      });
      notifyBankToast(`Đã gửi thành công ${amount} Vàng vào sổ tiết kiệm!`, 'success');
      return true;
    }
  }, [state.profile.coins, state.profile.bank]);

  const executeBankWithdraw = useCallback(async (amount?: number, depositId?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bank_withdraw',
          amount,
          depositId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const payout = data.payout || amount || 0;
        setState(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins + payout,
            bank: data.bank || prev.profile.bank,
          },
          ledger: [
            {
              id: `ledger_wd_${Date.now()}`,
              type: 'earn',
              category: 'bank_withdraw',
              amount,
              title: 'Rút tiền tiết kiệm',
              description: `Rút ${payout} Vàng từ Ngân Hàng về ví.`,
              timestamp: Date.now(),
            },
            ...prev.ledger,
          ],
        }));
        notifyBankToast(`Đã rút thành công +${payout} Vàng về ví!`, 'success');
        return true;
      }
    } catch {}

    // Fallback local withdrawal
    setState(prev => {
      const bank = prev.profile.bank;
      let payout = 0;
      const updatedDeposits = Array.isArray(bank.deposits) ? [...bank.deposits] : [];

      if (depositId) {
        const idx = updatedDeposits.findIndex(d => d.id === depositId);
        if (idx !== -1) {
          payout = updatedDeposits[idx].amount + (updatedDeposits[idx].interest || 0);
          updatedDeposits.splice(idx, 1);
        }
      } else {
        const amtToWithdraw = amount || (bank.deposited + bank.depositInterest);
        payout = Math.min(amtToWithdraw, bank.deposited + bank.depositInterest);
        const allocInterest = Math.min(bank.depositInterest, payout);
        const allocPrincipal = payout - allocInterest;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins + payout,
            bank: {
              ...bank,
              deposited: Math.max(0, bank.deposited - allocPrincipal),
              depositInterest: Math.max(0, bank.depositInterest - allocInterest),
              deposits: updatedDeposits,
            },
          },
          ledger: [
            {
              id: `ledger_wd_${Date.now()}`,
              type: 'earn',
              category: 'bank_withdraw',
              amount: payout,
              title: 'Rút tiền tiết kiệm',
              description: `Rút ${payout} Vàng từ Ngân Hàng về ví.`,
              timestamp: Date.now(),
            },
            ...prev.ledger,
          ],
        };
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          coins: prev.profile.coins + payout,
          bank: {
            ...bank,
            deposited: updatedDeposits.reduce((sum, d) => sum + d.amount, 0),
            depositInterest: updatedDeposits.reduce((sum, d) => sum + (d.interest || 0), 0),
            deposits: updatedDeposits,
          },
        },
        ledger: [
          {
            id: `ledger_wd_${Date.now()}`,
            type: 'earn',
            category: 'bank_withdraw',
            amount: payout,
            title: 'Rút tiền tiết kiệm',
            description: `Rút ${payout} Vàng từ Ngân Hàng về ví.`,
            timestamp: Date.now(),
          },
          ...prev.ledger,
        ],
      };
    });
    notifyBankToast('Đã rút tiền tiết kiệm thành công!', 'success');
    return true;
  }, []);

  const executeBankBorrow = useCallback(async (amount: number, termDays: number, autoDeductPercent: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bank_borrow',
          amount,
          termDays,
          autoDeductPercent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins + amount,
            bank: data.bank || prev.profile.bank,
          },
          ledger: [
            {
              id: `ledger_borrow_${Date.now()}`,
              type: 'earn',
              category: 'bank_borrow',
              amount,
              title: `Vay Vàng tín chấp (${termDays} ngày)`,
              description: `Vay ${amount} Vàng tiêu ngay, cam kết trích ${Math.round(autoDeductPercent * 100)}% trả nợ.`,
              timestamp: Date.now(),
            },
            ...prev.ledger,
          ],
        }));
        notifyBankToast(`Đã vay thành công +${amount} Vàng vào ví!`, 'success');
        return true;
      }
    } catch {}

    // Fallback local borrow
    const newLoan: BankLoan = {
      amount,
      principal: amount,
      debt: amount,
      borrowRate: 0.05,
      termDays,
      autoDeductPercent,
      borrowedAt: Date.now(),
      lastAccruedAt: Date.now(),
      dueTimestamp: Date.now() + termDays * 24 * 3600 * 1000,
      isOverdue: false,
    };
    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        coins: prev.profile.coins + amount,
        bank: {
          ...prev.profile.bank,
          loan: newLoan,
        },
      },
      ledger: [
        {
          id: `ledger_borrow_${Date.now()}`,
          type: 'earn',
          category: 'bank_borrow',
          amount,
          title: `Vay Vàng tín chấp (${termDays} ngày)`,
          description: `Vay ${amount} Vàng tiêu ngay, cam kết trích ${Math.round(autoDeductPercent * 100)}% trả nợ.`,
          timestamp: Date.now(),
        },
        ...prev.ledger,
      ],
    }));
    notifyBankToast(`Đã vay thành công +${amount} Vàng vào ví!`, 'success');
    return true;
  }, []);

  const executeBankRepay = useCallback(async (_amount?: number): Promise<boolean> => {
    const loan = state.profile.bank?.loan;
    if (!loan || (loan.debt || 0) <= 0) {
      notifyBankToast('Bạn không có khoản nợ nào cần thanh toán!', 'info');
      return false;
    }
    const currentDebt = loan.debt;
    const penalty = Math.max(1, Math.ceil(currentDebt * 0.05));
    const totalToPay = currentDebt + penalty;
    const userCoins = state.profile.coins;

    if (userCoins < totalToPay) {
      notifyBankToast(`Số dư không đủ! Cần ${totalToPay} Vàng (${currentDebt} nợ + ${penalty} phí tất toán sớm).`, 'error');
      return false;
    }

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bank_repay',
          amount: totalToPay,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins - totalToPay,
            bank: data.bank || { ...prev.profile.bank, loan: null, isFrozen: false },
          },
          ledger: [
            {
              id: `ledger_repay_${Date.now()}`,
              type: 'spend',
              category: 'bank_repay',
              amount: totalToPay,
              title: 'Tất toán nợ sớm',
              description: `Đã thanh toán sạch ${currentDebt} Vàng nợ và ${penalty} Vàng phí tất toán trước hạn.`,
              timestamp: Date.now(),
            },
            ...prev.ledger,
          ],
        }));
        notifyBankToast('Đã tất toán toàn bộ khoản nợ thành công!', 'success');
        return true;
      }
    } catch {}

    // Fallback local repay
    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        coins: prev.profile.coins - totalToPay,
        bank: {
          ...prev.profile.bank,
          loan: null,
          isFrozen: false,
        },
      },
      ledger: [
        {
          id: `ledger_repay_${Date.now()}`,
          type: 'spend',
          category: 'bank_repay',
          amount: totalToPay,
          title: 'Tất toán nợ sớm',
          description: `Đã thanh toán sạch ${currentDebt} Vàng nợ và ${penalty} Vàng phí tất toán trước hạn.`,
          timestamp: Date.now(),
        },
        ...prev.ledger,
      ],
    }));
    notifyBankToast('Đã tất toán toàn bộ khoản nợ thành công!', 'success');
    return true;
  }, [state.profile.bank?.loan, state.profile.coins]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as {
      openQuestProofModal?: (q: Quest) => void;
      openProofViewerModal?: (
        imageUrl?: string | null,
        questTitle?: string,
        userNote?: string,
        feedback?: string,
        timestamp?: number | null
      ) => void;
      openQuestModal?: (q?: Quest) => void;
      openRewardModal?: (r?: ShopItem) => void;
      openBankRulesModal?: (sectionId?: string) => void;
      openBankWithdrawModal?: (depositId?: string) => void;
      openCreditLimitModal?: () => void;
      loadBankState?: () => Promise<void>;
      executeBankDeposit?: (amount: number, termDays: number) => Promise<boolean>;
      executeBankWithdraw?: (amount?: number, depositId?: string) => Promise<boolean>;
      executeBankBorrow?: (amount: number, termDays: number, autoDeductPercent: number) => Promise<boolean>;
      executeBankRepay?: (amount?: number) => Promise<boolean>;
      getAllProofPhotos?: () => ProofPhotoItem[];
      renderProofPhotos?: () => void;
      renderLedger?: () => void;
      switchLedgerSubtab?: (s: string) => void;
      setLedgerFilter?: (f: string) => void;
      changeLedgerPage?: (delta: number) => void;
    };
    win.openQuestProofModal = (quest: Quest) => {
      openProofModal(quest);
    };
    win.openProofViewerModal = (
      imageUrl?: string | null,
      questTitle?: string,
      userNote?: string,
      feedback?: string,
      timestamp?: number | null
    ) => {
      openProofViewer({ imageUrl, questTitle, userNote, feedback, timestamp });
    };
    win.openQuestModal = (q?: Quest) => {
      openQuestModal(q);
    };
    win.openRewardModal = (r?: ShopItem) => {
      openRewardModal(r);
    };
    win.openBankRulesModal = (sectionId?: string) => {
      openBankRulesModal(sectionId);
    };
    win.openBankWithdrawModal = (depositId?: string) => {
      openBankWithdrawModal(depositId);
    };
    win.openCreditLimitModal = () => {
      openCreditLimitModal();
    };
    win.loadBankState = () => {
      return loadBankState();
    };
    win.executeBankDeposit = (amount: number, termDays: number) => {
      return executeBankDeposit(amount, termDays);
    };
    win.executeBankWithdraw = (amount?: number, depositId?: string) => {
      return executeBankWithdraw(amount, depositId);
    };
    win.executeBankBorrow = (amount: number, termDays: number, autoDeductPercent: number) => {
      return executeBankBorrow(amount, termDays, autoDeductPercent);
    };
    win.executeBankRepay = (amount?: number) => {
      return executeBankRepay(amount);
    };
    win.getAllProofPhotos = () => {
      return getAllProofPhotos(state.proofPhotos, state.ledger, state.quests);
    };
    win.renderProofPhotos = () => {
      // Handled reactively by React 19 ProofPhotosView
    };
    win.renderLedger = () => {
      // Handled reactively by React 19 LedgerContainer
    };

    // Keyboard shortcut Q to open quest setup modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
        if (activeTag !== 'input' && activeTag !== 'textarea' && !isEditable) {
          e.preventDefault();
          openQuestModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openProofModal,
    openProofViewer,
    openQuestModal,
    openRewardModal,
    openBankRulesModal,
    openBankWithdrawModal,
    openCreditLimitModal,
    loadBankState,
    executeBankDeposit,
    executeBankWithdraw,
    executeBankBorrow,
    executeBankRepay,
    state.proofPhotos,
    state.ledger,
    state.quests,
  ]);

  const addQuest = useCallback((newQuestData: Partial<Quest>) => {
    const newQuest: Quest = {
      id: newQuestData.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newQuestData.title || 'Nhiệm vụ mới',
      description: newQuestData.description || '',
      type: newQuestData.type || 'focus',
      rank: newQuestData.rank || 'C',
      rewardCoins: newQuestData.rewardCoins || 10,
      targetMinutes:
        newQuestData.targetMinutes !== undefined
          ? newQuestData.targetMinutes
          : newQuestData.type === 'bounty'
          ? 0
          : 25,
      icon: newQuestData.icon || '⚔️',
      isRepeatable: Boolean(newQuestData.isRepeatable),
      completedCount: newQuestData.completedCount || 0,
      status: newQuestData.status || 'active',
      createdAt: newQuestData.createdAt || Date.now(),
      requiresProof: Boolean(newQuestData.requiresProof),
      proofType: newQuestData.proofType || 'photo',
      proofGuidance: newQuestData.proofGuidance || '',
      advice: newQuestData.advice || '',
      verdict: newQuestData.verdict || '',
      signature: newQuestData.signature || '',
    };

    setState(prev => {
      const existingIdx = prev.quests.findIndex(q => q.id === newQuest.id);
      const nextQuests =
        existingIdx >= 0
          ? prev.quests.map((q, i) => (i === existingIdx ? { ...q, ...newQuest } : q))
          : [newQuest, ...prev.quests];
      const next = {
        ...prev,
        quests: dedupeById(nextQuests),
      };
      queueSyncToCloud(next, true);
      return next;
    });

    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        appState?: LevelUpAppState;
        triggerSave?: (needsCloud?: boolean, immediate?: boolean) => void;
      };
      if (win.appState) {
        if (!Array.isArray(win.appState.quests)) {
          win.appState.quests = [];
        }
        const existingIdx = win.appState.quests.findIndex(q => q.id === newQuest.id);
        if (existingIdx >= 0) {
          win.appState.quests[existingIdx] = { ...win.appState.quests[existingIdx], ...newQuest };
        } else {
          win.appState.quests.unshift(newQuest);
        }
        win.appState.quests = dedupeById(win.appState.quests);
        win.triggerSave?.(true, true);
      }
      window.dispatchEvent(
        new CustomEvent('levelup:state-updated', {
          detail: win.appState || { quests: [newQuest] },
        })
      );
    }
  }, [queueSyncToCloud]);

  const deleteQuest = useCallback((questId: string) => {
    setState(prev => {
      const nextQuests = prev.quests.filter(q => q.id !== questId);
      const next = {
        ...prev,
        quests: nextQuests,
      };
      queueSyncToCloud(next, true);
      return next;
    });
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        appState?: LevelUpAppState;
        triggerSave?: (needsCloud?: boolean, immediate?: boolean) => void;
      };
      if (win.appState && Array.isArray(win.appState.quests)) {
        win.appState.quests = win.appState.quests.filter(q => q.id !== questId);
        win.triggerSave?.(true, true);
      }
      window.dispatchEvent(
        new CustomEvent('levelup:state-updated', {
          detail: win.appState,
        })
      );
    }
  }, [queueSyncToCloud]);

  const startFocusTimer = useCallback((quest: Quest) => {
    const minutes = quest.targetMinutes || 25;
    const totalSeconds = minutes * 60;

    setState(prev => ({
      ...prev,
      activeTimer: {
        status: 'running',
        remainingSeconds: totalSeconds,
        totalSeconds,
        questId: quest.id,
        questTitle: quest.title,
        questCoins: quest.rewardCoins,
        questRank: quest.rank,
        startedAt: Date.now(),
      },
    }));
  }, []);

  const pauseFocusTimer = useCallback(() => {
    setState(prev => {
      if (!prev.activeTimer) return prev;
      return {
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          status: 'paused',
        },
      };
    });
  }, []);

  const resumeFocusTimer = useCallback(() => {
    setState(prev => {
      if (!prev.activeTimer) return prev;
      return {
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          status: 'running',
        },
      };
    });
  }, []);

  const holdFocusTimer = useCallback(() => {
    setState(prev => {
      if (!prev.activeTimer) return prev;
      return {
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          status: 'held',
          heldAt: Date.now(),
        },
      };
    });
  }, []);

  const buyShopItem = useCallback(
    async (item: ShopItem): Promise<boolean> => {
      // 1. Kiểm tra nợ quá hạn
      if (state.profile?.bank?.isFrozen || (state.profile?.bank?.loan && state.profile.bank.loan.isOverdue)) {
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (msg: string, type: string) => void }).showToast(
            'Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi đổi quà.',
            'error'
          );
        }
        return false;
      }

      const itemPrice = Math.max(0, Number(item.price) || 0);
      if (state.profile.coins < itemPrice) {
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (msg: string, type: string) => void }).showToast(
            `Chưa đủ Vàng! Bạn cần thêm ${itemPrice - state.profile.coins} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`,
            'error'
          );
        }
        return false;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const newInvItem: InventoryItem = {
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        shopItemId: item.id,
        name: item.name,
        description: item.description || '',
        price: itemPrice,
        tier: item.tier,
        icon: item.icon || '🎁',
        targetMinutes: item.targetMinutes || 0,
        purchasedAt: Date.now(),
        purchasedDateStr: todayStr,
        isUsed: false,
      };

      const newLedgerEntry: LedgerEntry = {
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'spend',
        category: 'reward',
        amount: itemPrice,
        title: `Đổi quà: ${item.name}`,
        description: `Đổi quà: ${item.name}`,
        timestamp: Date.now(),
      };

      // React 19 Optimistic update
      startTransition(() => {
        setOptimisticProfile({
          coins: Math.max(0, state.profile.coins - itemPrice),
          totalCoinsSpent: state.profile.totalCoinsSpent + itemPrice,
        });
        setOptimisticInventory({
          type: 'buy',
          item: newInvItem,
        });
      });

      // SFX & Confetti & Toast
      if (state.profile.soundEnabled) soundFX.playFanfare();
      if (typeof window !== 'undefined') {
        try {
          const confetti = (window as unknown as { confetti?: (opts?: unknown) => void }).confetti;
          if (typeof confetti === 'function') {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }
          const showToast = (window as unknown as { showToast?: (msg: string, type: string, opts?: unknown) => void }).showToast;
          if (typeof showToast === 'function') {
            showToast(`Đổi quà thành công! "${item.name}" đã được chuyển vào Túi Đồ.`, 'success', {
              label: 'Hoàn tác',
              onClick: () => refundInventoryItem(newInvItem.id),
            });
          }
        } catch (_) {}
      }

      // Persist to state
      setState(prev => {
        const updatedShop = prev.shopItems.map(s => {
          if (s.id === item.id) {
            const history = { ...(s.history || {}) };
            history[todayStr] = (Number(history[todayStr]) || 0) + 1;
            return { ...s, history };
          }
          return s;
        });

        const nextState: LevelUpAppState = {
          ...prev,
          profile: {
            ...prev.profile,
            coins: Math.max(0, prev.profile.coins - itemPrice),
            totalCoinsSpent: prev.profile.totalCoinsSpent + itemPrice,
          },
          inventory: [newInvItem, ...prev.inventory],
          shopItems: updatedShop,
          ledger: [newLedgerEntry, ...prev.ledger],
        };

        // Sync with global window.appState if present
        if (typeof window !== 'undefined') {
          const win = window as unknown as { appState?: LevelUpAppState; triggerSave?: (t: boolean) => void };
          if (win.appState) {
            win.appState.profile.coins = nextState.profile.coins;
            win.appState.profile.totalCoinsSpent = nextState.profile.totalCoinsSpent;
            win.appState.inventory = nextState.inventory;
            win.appState.shopItems = nextState.shopItems;
            win.appState.ledger = nextState.ledger;
            if (typeof win.triggerSave === 'function') win.triggerSave(true);
          }
        }
        return nextState;
      });

      return true;
    },
    [state.profile, setOptimisticProfile, setOptimisticInventory]
  );

  const refundInventoryItem = useCallback(
    async (invId: string) => {
      const item = state.inventory.find(i => i.id === invId);
      if (!item) return;

      const refundCoins = item.price || 0;
      const newLedgerEntry: LedgerEntry = {
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'earn',
        category: 'reward',
        amount: refundCoins,
        title: `Hoàn trả quà: ${item.name}`,
        description: `Hoàn trả quà: ${item.name}`,
        timestamp: Date.now(),
      };

      startTransition(() => {
        setOptimisticProfile({
          coins: state.profile.coins + refundCoins,
          totalCoinsSpent: Math.max(0, state.profile.totalCoinsSpent - refundCoins),
        });
        setOptimisticInventory({
          type: 'refund',
          id: invId,
        });
      });

      if (state.profile.soundEnabled) soundFX.playCoin();
      if (typeof window !== 'undefined') {
        try {
          const showToast = (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast;
          if (typeof showToast === 'function') {
            showToast(`Đã hoàn trả "${item.name}" (+${refundCoins} Vàng).`, 'gold');
          }
        } catch (_) {}
      }

      setState(prev => {
        const nextInv = prev.inventory.filter(i => i.id !== invId);
        const nextShop = prev.shopItems.map(s => {
          if (s.id === item.shopItemId && s.history && item.purchasedDateStr) {
            const hist = { ...s.history };
            if (hist[item.purchasedDateStr]) {
              hist[item.purchasedDateStr] = Math.max(0, Number(hist[item.purchasedDateStr]) - 1);
            }
            return { ...s, history: hist };
          }
          return s;
        });

        const nextState: LevelUpAppState = {
          ...prev,
          profile: {
            ...prev.profile,
            coins: prev.profile.coins + refundCoins,
            totalCoinsSpent: Math.max(0, prev.profile.totalCoinsSpent - refundCoins),
          },
          inventory: nextInv,
          shopItems: nextShop,
          ledger: [newLedgerEntry, ...prev.ledger],
        };

        if (typeof window !== 'undefined') {
          const win = window as unknown as { appState?: LevelUpAppState; triggerSave?: (t: boolean) => void };
          if (win.appState) {
            win.appState.profile.coins = nextState.profile.coins;
            win.appState.profile.totalCoinsSpent = nextState.profile.totalCoinsSpent;
            win.appState.inventory = nextState.inventory;
            win.appState.shopItems = nextState.shopItems;
            win.appState.ledger = nextState.ledger;
            if (typeof win.triggerSave === 'function') win.triggerSave(true);
          }
        }
        return nextState;
      });
    },
    [state.inventory, state.profile.coins, state.profile.totalCoinsSpent, state.profile.soundEnabled, setOptimisticProfile, setOptimisticInventory]
  );

  const undoUseInventoryItem = useCallback(
    async (invId: string) => {
      const item = state.inventory.find(i => i.id === invId);
      if (!item || !item.isUsed) return;

      if (item.usedAt && Date.now() - item.usedAt > 5 * 60 * 1000) {
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (msg: string, type: string) => void }).showToast(
            `Phần thưởng "${item.name}" đã quá thời hạn hoàn tác (5 phút).`,
            'warning'
          );
        }
        return;
      }

      startTransition(() => {
        setOptimisticInventory({
          type: 'undo',
          id: invId,
        });
      });

      setState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i =>
          i.id === invId ? { ...i, isUsed: false, usedAt: undefined } : i
        ),
        activeTimer: prev.activeTimer?.rewardId === invId ? null : prev.activeTimer,
      }));

      if (typeof window !== 'undefined') {
        try {
          const showToast = (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast;
          if (typeof showToast === 'function') {
            showToast(`Đã hoàn tác: "${item.name}" được chuyển lại về trạng thái chưa dùng.`, 'info');
          }
        } catch (_) {}
      }
    },
    [state.inventory, setOptimisticInventory]
  );

  const useInventoryItem = useCallback(
    async (invId: string) => {
      const item = state.inventory.find(i => i.id === invId);
      if (!item) return;

      if (state.profile?.bank?.isFrozen || (state.profile?.bank?.loan && state.profile.bank.loan.isOverdue)) {
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (msg: string, type: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (msg: string, type: string) => void }).showToast(
            'Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi sử dụng quà.',
            'error'
          );
        }
        return;
      }

      const durationMinutes = item.targetMinutes || 0;

      startTransition(() => {
        setOptimisticInventory({
          type: 'use',
          id: invId,
        });
      });

      // If item has duration, trigger focus timer in reward mode
      if (durationMinutes > 0) {
        const totalSeconds = durationMinutes * 60;
        setState(prev => ({
          ...prev,
          activeTimer: {
            status: 'running',
            remainingSeconds: totalSeconds,
            totalSeconds,
            rewardId: item.id,
            rewardTitle: item.name,
            isReward: true,
            startedAt: Date.now(),
          },
          inventory: prev.inventory.map(i =>
            i.id === invId ? { ...i, isUsed: true, usedAt: Date.now() } : i
          ),
        }));
      } else {
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.map(i =>
            i.id === invId ? { ...i, isUsed: true, usedAt: Date.now() } : i
          ),
        }));
      }

      // SFX & Toast
      if (state.profile.soundEnabled) soundFX.playFanfare();
      if (typeof window !== 'undefined') {
        try {
          const showToast = (window as unknown as { showToast?: (msg: string, type: string, opts?: unknown) => void }).showToast;
          if (typeof showToast === 'function') {
            showToast(`🎉 Đã sử dụng "${item.name}"! Chúc mừng bạn đã nỗ lực và tự thưởng xứng đáng!`, 'success', {
              label: 'Hoàn tác',
              onClick: () => undoUseInventoryItem(invId),
            });
          }
        } catch (_) {}
      }
    },
    [state.inventory, state.profile.bank, state.profile.soundEnabled, setOptimisticInventory, undoUseInventoryItem]
  );

  const addShopItem = useCallback((newItemData: Partial<ShopItem>) => {
    const newItem: ShopItem = {
      id: newItemData.id || `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newItemData.name || 'Phần thưởng mới',
      description: newItemData.description || '',
      price: Math.max(1, Number(newItemData.price) || 10),
      tier: newItemData.tier || 'common',
      icon: newItemData.icon || '🎁',
      targetMinutes: Math.max(0, Number(newItemData.targetMinutes) || 0),
      history: newItemData.history || {},
      verdict: newItemData.verdict || 'Phần thưởng tự tạo khích lệ tinh thần.',
    };

    setState(prev => {
      const existingIdx = prev.shopItems.findIndex(s => s.id === newItem.id);
      const nextShopItems =
        existingIdx >= 0
          ? prev.shopItems.map((s, i) => (i === existingIdx ? { ...s, ...newItem } : s))
          : [newItem, ...prev.shopItems];
      const next = {
        ...prev,
        shopItems: dedupeById(nextShopItems),
      };
      queueSyncToCloud(next, true);
      return next;
    });

    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        appState?: LevelUpAppState;
        triggerSave?: (needsCloud?: boolean, immediate?: boolean) => void;
      };
      if (win.appState) {
        if (!Array.isArray(win.appState.shopItems)) {
          win.appState.shopItems = [];
        }
        const existingIdx = win.appState.shopItems.findIndex(s => s.id === newItem.id);
        if (existingIdx >= 0) {
          win.appState.shopItems[existingIdx] = { ...win.appState.shopItems[existingIdx], ...newItem };
        } else {
          win.appState.shopItems.unshift(newItem);
        }
        win.appState.shopItems = dedupeById(win.appState.shopItems);
        win.triggerSave?.(true, true);
      }
      window.dispatchEvent(
        new CustomEvent('levelup:state-updated', {
          detail: win.appState || { shopItems: [newItem] },
        })
      );
    }
  }, [queueSyncToCloud]);

  const deleteShopItem = useCallback((itemId: string) => {
    setState(prev => {
      const nextShopItems = prev.shopItems.filter(s => s.id !== itemId);
      const next = {
        ...prev,
        shopItems: nextShopItems,
      };
      queueSyncToCloud(next, true);
      return next;
    });
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        appState?: LevelUpAppState;
        triggerSave?: (needsCloud?: boolean, immediate?: boolean) => void;
      };
      if (win.appState && Array.isArray(win.appState.shopItems)) {
        win.appState.shopItems = win.appState.shopItems.filter(s => s.id !== itemId);
        win.triggerSave?.(true, true);
      }
      window.dispatchEvent(
        new CustomEvent('levelup:state-updated', {
          detail: win.appState,
        })
      );
    }
  }, [queueSyncToCloud]);

  const startRewardTimer = useCallback((item: InventoryItem) => {
    const minutes = item.targetMinutes || 15;
    const totalSeconds = minutes * 60;
    setState(prev => ({
      ...prev,
      activeTimer: {
        status: 'running',
        remainingSeconds: totalSeconds,
        totalSeconds,
        rewardId: item.id,
        rewardTitle: item.name,
        isReward: true,
        startedAt: Date.now(),
      },
    }));
  }, []);

  const startBreakTimer = useCallback((breakMins = 5) => {
    const secs = breakMins * 60;
    setState(prev => ({
      ...prev,
      activeTimer: {
        status: 'running',
        remainingSeconds: secs,
        totalSeconds: secs,
        isReward: false,
        questTitle: 'Nghỉ giải lao',
        startedAt: Date.now(),
      },
    }));
  }, []);

  const resetFocusTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeTimer: null,
      lastTimerClearedAt: Date.now(),
    }));
  }, []);

  const adjustFocusTimer = useCallback((deltaSeconds: number) => {
    setState(prev => {
      if (!prev.activeTimer) return prev;
      const newRemaining = Math.max(0, prev.activeTimer.remainingSeconds + deltaSeconds);
      const newTotal =
        deltaSeconds > 0 && newRemaining > prev.activeTimer.totalSeconds
          ? newRemaining
          : prev.activeTimer.totalSeconds;
      return {
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          remainingSeconds: newRemaining,
          totalSeconds: newTotal,
        },
      };
    });
  }, []);

  const setFocusTimerRemaining = useCallback((seconds: number) => {
    setState(prev => {
      if (!prev.activeTimer) return prev;
      return {
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          remainingSeconds: Math.max(0, seconds),
          totalSeconds: Math.max(prev.activeTimer.totalSeconds, seconds),
        },
      };
    });
  }, []);

  const setActiveNoteId = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      activeNoteId: id,
      focusNotes: prev.notes.find(note => note.id === id)?.content || '',
    }));
  }, []);

  const createNote = useCallback((defaultTopic: string = '') => {
    const newNoteId = `note_${crypto.randomUUID()}`;
    const newNote: NoteItem = {
      id: newNoteId,
      title: 'Ghi Chú Mới',
      topic: defaultTopic || 'Ghi Chép Nhanh',
      content: '<p></p>',
      pinned: false,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    startTransition(() => {
      setOptimisticNotes({ type: 'create', note: newNote });
    });

    setState(prev => {
      const updatedNotes = [newNote, ...prev.notes];
      return {
        ...prev,
        notes: updatedNotes,
        activeNoteId: newNoteId,
        focusNotes: newNote.content,
      };
    });

    return newNoteId;
  }, [setOptimisticNotes]);

  const updateNote = useCallback((id: string, updates: Partial<NoteItem>) => {
    const updatedAt = Date.now();
    startTransition(() => {
      setOptimisticNotes({ type: 'update', id, updates: { ...updates, updatedAt } });
    });

    setState(prev => {
      const updatedNotes = prev.notes.map(n =>
        n.id === id ? { ...n, ...updates, updatedAt } : n
      );
      const active = updatedNotes.find(n => n.id === (prev.activeNoteId || id));
      return {
        ...prev,
        notes: updatedNotes,
        focusNotes: active ? active.content : prev.focusNotes,
      };
    });
  }, [setOptimisticNotes]);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    startTransition(() => {
      setOptimisticNotes({ type: 'delete', id });
    });

    setState(prev => {
      const remaining = prev.notes.filter(n => n.id !== id);
      if (remaining.length === 0) {
        remaining.push({
          id: `note_${crypto.randomUUID()}`,
          title: 'Ghi Chú Mới',
          topic: 'Ghi Chép Nhanh',
          content: '<p></p>',
          pinned: false,
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      const nextActiveId = remaining[0].id;
      return {
        ...prev,
        notes: remaining,
        activeNoteId: nextActiveId,
        focusNotes: remaining[0].content,
      };
    });

    return true;
  }, [setOptimisticNotes]);

  const togglePinNote = useCallback((id: string) => {
    startTransition(() => {
      setOptimisticNotes({ type: 'togglePin', id });
    });

    setState(prev => {
      const updatedNotes = prev.notes.map(n => {
        if (n.id === id) {
          const nextPinned = !(n.pinned ?? n.isPinned);
          return { ...n, pinned: nextPinned, isPinned: nextPinned, updatedAt: Date.now() };
        }
        return n;
      });
      return {
        ...prev,
        notes: updatedNotes,
      };
    });
  }, [setOptimisticNotes]);

  return (
    <LevelUpContext.Provider
      value={{
        state,
        optimisticProfile,
        optimisticQuests,
        optimisticInventory,
        optimisticNotes,
        activeNoteId: state.activeNoteId,
        activeTab,
        isSyncing,
        setActiveTab,
        completeQuest,
        addQuest,
        deleteQuest,
        activeProofQuest,
        pendingApprovedQuest,
        viewerProofData,
        isProofModalOpen,
        isProofApprovedModalOpen,
        isProofViewerModalOpen,
        openProofModal,
        closeProofModal,
        submitProof,
        claimApprovedProof,
        closeProofApprovedModal,
        openProofViewer,
        closeProofViewer,
        isQuestModalOpen,
        isRewardModalOpen,
        editingQuest,
        editingReward,
        openQuestModal,
        closeQuestModal,
        openRewardModal,
        closeRewardModal,
        isBankWithdrawModalOpen,
        isBankRulesModalOpen,
        isCreditLimitModalOpen,
        selectedWithdrawDepositId,
        openBankWithdrawModal,
        closeBankWithdrawModal,
        openBankRulesModal,
        closeBankRulesModal,
        openCreditLimitModal,
        closeCreditLimitModal,
        executeBankDeposit,
        executeBankWithdraw,
        executeBankBorrow,
        executeBankRepay,
        loadBankState,
        buyShopItem,
        useInventoryItem,
        refundInventoryItem,
        undoUseInventoryItem,
        addShopItem,
        deleteShopItem,
        setActiveNoteId,
        createNote,
        updateNote,
        deleteNote,
        togglePinNote,
        toggleTheme,
        toggleSound,
        togglePalette,
        startFocusTimer,
        startRewardTimer,
        startBreakTimer,
        pauseFocusTimer,
        resumeFocusTimer,
        holdFocusTimer,
        resetFocusTimer,
        adjustFocusTimer,
        setFocusTimerRemaining,
      }}
    >
      {children}
      {startupStatus !== 'ready' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50/95 px-5 dark:bg-slate-950/95"
          role="status"
          aria-live="polite"
          aria-busy={startupStatus === 'loading'}
        >
          {startupStatus === 'loading' ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Đang tải dữ liệu tài khoản...</p>
            </div>
          ) : (
            <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xl dark:border-rose-900 dark:bg-slate-900">
              <p className="font-bold text-slate-900 dark:text-white">Không tải được dữ liệu</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Kiểm tra kết nối mạng rồi thử tải lại dữ liệu.
              </p>
              <button
                type="button"
                onClick={() => setStartupAttempt(attempt => attempt + 1)}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      )}
    </LevelUpContext.Provider>
  );
}

export function useLevelUp() {
  const context = useContext(LevelUpContext);
  if (!context) {
    throw new Error('useLevelUp must be used within a LevelUpProvider');
  }
  return context;
}
