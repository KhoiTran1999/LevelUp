import type { LedgerEntry, ProofPhotoItem, Quest, BankAccount } from '@/types/levelup';

export const LEDGER_PAGE_SIZE = 10;

export type LedgerFilterType = 'all' | 'earn' | 'spend' | 'bank';
export type LedgerSubtabType = 'transactions' | 'photos';

/**
 * Thuật toán tổng hợp toàn bộ ảnh bằng chứng từ 3 nguồn:
 * 1. appState.proofPhotos
 * 2. appState.ledger (có proofImageUrl)
 * 3. appState.quests (có proofImageUrl)
 * Khử trùng lặp theo URL ảnh và sắp xếp mới nhất lên đầu.
 */
export function getAllProofPhotos(
  proofPhotos: ProofPhotoItem[] = [],
  ledger: LedgerEntry[] = [],
  quests: Quest[] = []
): ProofPhotoItem[] {
  const photos: ProofPhotoItem[] = [];
  const seenUrls = new Set<string>();

  // 1. From proofPhotos
  if (Array.isArray(proofPhotos)) {
    for (const p of proofPhotos) {
      if (p && p.proofImageUrl && !seenUrls.has(p.proofImageUrl)) {
        seenUrls.add(p.proofImageUrl);
        photos.push({
          id: p.id || `proof_${p.timestamp || Date.now()}`,
          questId: p.questId || '',
          questTitle: p.questTitle || 'Nhiệm vụ',
          proofImageUrl: p.proofImageUrl,
          rewardCoins: p.rewardCoins || 10,
          timestamp: p.timestamp || Date.now(),
          userNote: p.userNote || '',
          feedback: p.feedback || '',
        });
      }
    }
  }

  // 2. From ledger
  if (Array.isArray(ledger)) {
    for (const entry of ledger) {
      if (entry && entry.proofImageUrl && !seenUrls.has(entry.proofImageUrl)) {
        seenUrls.add(entry.proofImageUrl);
        photos.push({
          id: `proof_${entry.id || entry.timestamp || Date.now()}`,
          questId: entry.questId || '',
          questTitle: entry.title || 'Nhiệm vụ',
          proofImageUrl: entry.proofImageUrl,
          rewardCoins: entry.amount || 10,
          timestamp: entry.timestamp || Date.now(),
          userNote: entry.proofUserNote || entry.userNote || '',
          feedback: entry.proofFeedback || entry.feedback || '',
        });
      }
    }
  }

  // 3. From quests
  if (Array.isArray(quests)) {
    for (const q of quests) {
      if (q && q.proofImageUrl && !seenUrls.has(q.proofImageUrl)) {
        seenUrls.add(q.proofImageUrl);
        photos.push({
          id: `proof_${q.id}`,
          questId: q.id,
          questTitle: q.title,
          proofImageUrl: q.proofImageUrl,
          rewardCoins: q.rewardCoins || 10,
          timestamp: q.createdAt || Date.now(),
          userNote: q.proofUserNote || '',
          feedback: q.proofFeedback || '',
        });
      }
    }
  }

  // Sort descending by timestamp
  photos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return photos;
}

/**
 * Gom nhóm giao dịch theo tiêu đề ngày ("Hôm nay", "Hôm qua", hoặc định dạng vi-VN).
 */
export function groupLedgerByDate(entries: LedgerEntry[]): Record<string, LedgerEntry[]> {
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  return entries.reduce((groups: Record<string, LedgerEntry[]>, item) => {
    const ts = parseInt(String(item.timestamp), 10) || Date.now();
    const d = new Date(ts).toDateString();
    const label = d === todayStr ? 'Hôm nay' : (d === yesterdayStr ? 'Hôm qua' : new Date(ts).toLocaleDateString('vi-VN'));
    (groups[label] = groups[label] || []).push(item);
    return groups;
  }, {});
}

/**
 * Tính toán số liệu thống kê thu chi trong ngày và số dư ngân hàng.
 */
export function calculateLedgerStats(
  ledger: LedgerEntry[] = [],
  bank?: BankAccount
): {
  todayEarn: number;
  todaySpend: number;
  totalBankDeposits: number;
  currentBankDebt: number;
} {
  const todayStr = new Date().toDateString();
  let todayEarn = 0;
  let todaySpend = 0;

  if (Array.isArray(ledger)) {
    ledger.forEach(e => {
      if (new Date(e.timestamp || 0).toDateString() === todayStr) {
        const amt = Math.max(0, parseInt(String(e.amount), 10) || 0);
        if (e.type === 'earn') todayEarn += amt;
        else if (e.type === 'spend') todaySpend += amt;
      }
    });
  }

  const totalBankDeposits = (parseInt(String(bank?.deposited || 0), 10) || 0) + (parseInt(String(bank?.depositInterest || 0), 10) || 0);
  const currentBankDebt = parseInt(String(bank?.loan?.debt || 0), 10) || 0;

  return {
    todayEarn,
    todaySpend,
    totalBankDeposits,
    currentBankDebt,
  };
}

/**
 * Lọc giao dịch theo danh mục (Tất cả / Thu nhập / Đổi quà / Ngân Hàng).
 */
export function filterLedgerEntries(
  entries: LedgerEntry[] = [],
  filter: LedgerFilterType = 'all'
): LedgerEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'bank') {
      return (
        typeof e.category === 'string' &&
        (e.category.startsWith('bank_') ||
          ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay', 'bank_deduct'].includes(e.category))
      );
    }
    return e.type === filter;
  });
}

export interface CategoryDisplayConfig {
  icon: string;
  label: string;
  colorClass: string;
}

/**
 * Lấy cấu hình hiển thị icon và badge danh mục cho từng dòng giao dịch.
 */
export function getLedgerCategoryConfig(entry: LedgerEntry): CategoryDisplayConfig {
  const isEarn = entry.type === 'earn';

  if (entry.category === 'bank_deposit') {
    return {
      icon: '🏦',
      label: 'Tiết Kiệm',
      colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    };
  }
  if (entry.category === 'bank_withdraw') {
    return {
      icon: '💰',
      label: 'Rút Tiền',
      colorClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    };
  }
  if (entry.category === 'bank_borrow') {
    return {
      icon: '⚡',
      label: 'Vay Vàng',
      colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    };
  }
  if (entry.category === 'bank_repay') {
    return {
      icon: '💳',
      label: 'Trả Nợ',
      colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    };
  }
  if (entry.category === 'bank_deduct') {
    return {
      icon: '✂️',
      label: 'Trích Nợ',
      colorClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    };
  }
  if (entry.category === 'quest') {
    return {
      icon: '📥',
      label: 'Nhiệm Vụ',
      colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    };
  }
  if (entry.category === 'reward') {
    return {
      icon: '📤',
      label: 'Đổi Quà',
      colorClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    };
  }

  return {
    icon: isEarn ? '📥' : '📤',
    label: isEarn ? 'Thu Nhập' : 'Chi Tiêu',
    colorClass: isEarn
      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  };
}
