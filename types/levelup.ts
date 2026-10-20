export type QuestType = 'focus' | 'bounty';
export type QuestRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type QuestStatus = 'active' | 'completed' | 'failed';

export type ProofType = 'photo' | 'text' | 'both';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  rank: QuestRank;
  rewardCoins: number;
  targetMinutes: number;
  icon: string;
  advice?: string;
  verdict?: string;
  isRepeatable: boolean;
  completedCount: number;
  status: QuestStatus;
  requiresProof?: boolean;
  proofType?: ProofType;
  proofGuidance?: string;
  proofImageUrl?: string;
  proofUserNote?: string;
  proofFeedback?: string;
  _proofVerified?: boolean;
  focusTimerCompleted?: boolean;
  signature?: string;
  history?: Record<string, unknown>;
  createdAt: number;
  savedTimer?: {
    remainingSeconds: number;
    totalSeconds?: number;
    actualFocusedSeconds?: number;
    savedAt?: number;
  };
}

export interface ProofPhotoItem {
  id: string;
  questId: string;
  questTitle?: string;
  proofImageUrl?: string;
  photoUrl?: string;
  rewardCoins?: number;
  userNote?: string;
  feedback?: string;
  timestamp?: number;
  createdAt?: number;
}

export interface ViewerProofData {
  imageUrl?: string | null;
  questTitle?: string;
  userNote?: string;
  feedback?: string;
  timestamp?: number | null;
}

export interface ProofSubmissionPayload {
  questId: string;
  title: string;
  description?: string;
  proofType: ProofType;
  workContent?: string;
  userNote?: string;
  imageBase64?: string;
}

export interface ProofVerificationResult {
  approved: boolean;
  feedback: string;
  proofImageUrl?: string;
  error?: string;
}

export type ShopItemTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: ShopItemTier;
  icon: string;
  targetMinutes: number;
  history?: Record<string, unknown>;
  verdict?: string;
  signature?: string;
}

export interface InventoryItem {
  id: string;
  shopItemId?: string;
  itemId?: string;
  name: string;
  description?: string;
  price: number;
  tier: ShopItemTier;
  icon: string;
  targetMinutes?: number;
  signature?: string;
  purchasedAt: number;
  purchasedDateStr?: string;
  isUsed: boolean;
  used?: boolean;
  usedAt?: number;
  savedTimer?: {
    remainingSeconds: number;
    totalSeconds: number;
    savedAt: number;
  };
}

export interface BankLoan {
  amount: number;
  principal: number;
  interestRate: number;
  termDays: number;
  dueTimestamp: number;
  isOverdue: boolean;
}

export interface BankAccount {
  deposited: number;
  depositInterest: number;
  lastDepositAt: number;
  termDays?: number;
  loan: BankLoan | null;
  isFrozen: boolean;
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  level: number;
  exp: number;
  coins: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalFocusSessions: number;
  title: string;
  streak: number;
  lastStreakDate: string;
  streakHistory: string[];
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  role: 'adventurer' | 'admin';
  token?: string;
  googleId?: string;
  googleEmail?: string;
  googlePicture?: string;
  googleToken?: string;
  sessionToken?: string;
  hasOnboarded?: boolean;
  bank: BankAccount;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  topic?: string;
  isPinned?: boolean;
  pinned?: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface LedgerEntry {
  id: string;
  type: 'earn' | 'spend';
  category: string;
  amount: number;
  title: string;
  description: string;
  timestamp: number;
}

export interface ActiveTimer {
  status: 'idle' | 'running' | 'paused' | 'held';
  remainingSeconds: number;
  totalSeconds: number;
  questId?: string;
  questTitle?: string;
  questCoins?: number;
  questRank?: QuestRank;
  rewardId?: string;
  rewardTitle?: string;
  isReward?: boolean;
  startedAt?: number;
  heldAt?: number;
}

export interface LevelUpAppState {
  profile: UserProfile;
  focusNotes: string;
  notes: NoteItem[];
  activeNoteId: string;
  quests: Quest[];
  shopItems: ShopItem[];
  inventory: InventoryItem[];
  completedQuestIds: string[];
  proofPhotos: ProofPhotoItem[];
  ledger: LedgerEntry[];
  activeTimer: ActiveTimer | null;
  lastTimerClearedAt: number;
  lastSyncedAt: number;
}

export type TabType =
  | 'quests'
  | 'shop'
  | 'notes'
  | 'bank'
  | 'leaderboard'
  | 'ledger'
  | 'tracker'
  | 'admin';
