'use server';

import { dedupeById } from '@/lib/server/crypto';
import type { Quest, ShopItem, NoteItem, LevelUpAppState } from '@/types/levelup';
import { listNotes, removeNote, saveNote } from '@/lib/server/notes';
import {
  resolveAuthenticatedUser,
  fetchUserState,
  commitUserState,
  type ActionResponse,
} from '@/lib/server/user-state';

export type { ActionResponse };

/**
 * Server Action: Create or Update Quest
 */
export async function saveQuestAction(
  questData: Partial<Quest>,
  sessionToken?: string
): Promise<ActionResponse<Quest>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  const title = (questData?.title || '').trim();
  if (!title) {
    return { success: false, error: 'Tiêu đề nhiệm vụ không được để trống.' };
  }

  const questId = questData.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const normalizedQuest: Quest = {
    id: questId,
    title,
    description: questData.description || '',
    type: questData.type === 'bounty' ? 'bounty' : 'focus',
    rank: questData.rank || 'C',
    rewardCoins: Math.max(1, Number(questData.rewardCoins) || 10),
    targetMinutes: questData.type === 'bounty' ? 0 : Math.max(0, Number(questData.targetMinutes) || 25),
    icon: questData.icon || '⚔️',
    isRepeatable: Boolean(questData.isRepeatable),
    completedCount: Math.max(0, Number(questData.completedCount) || 0),
    status: questData.status || 'active',
    createdAt: questData.createdAt || Date.now(),
    requiresProof: Boolean(questData.requiresProof),
    proofType: questData.proofType || 'photo',
    proofGuidance: questData.proofGuidance || '',
    advice: questData.advice || '',
    verdict: questData.verdict || '',
    signature: questData.signature || '',
  };

  const state = await fetchUserState(user.sub);
  const existingIdx = state.quests.findIndex(q => q.id === questId);
  if (existingIdx >= 0) {
    state.quests[existingIdx] = { ...state.quests[existingIdx], ...normalizedQuest };
  } else {
    state.quests.unshift(normalizedQuest);
  }
  state.quests = dedupeById(state.quests);

  await commitUserState(user.sub, state);
  return { success: true, data: normalizedQuest };
}

/**
 * Server Action: Delete Quest
 */
export async function deleteQuestAction(
  questId: string,
  sessionToken?: string
): Promise<ActionResponse<{ id: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  if (!questId || typeof questId !== 'string') {
    return { success: false, error: 'Mã nhiệm vụ không hợp lệ.' };
  }

  const state = await fetchUserState(user.sub);
  state.quests = state.quests.filter(q => q.id !== questId);
  await commitUserState(user.sub, state);

  return { success: true, data: { id: questId } };
}

/**
 * Server Action: Create or Update Shop Item (Reward)
 */
export async function saveShopItemAction(
  itemData: Partial<ShopItem>,
  sessionToken?: string
): Promise<ActionResponse<ShopItem>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  const name = (itemData?.name || '').trim();
  if (!name) {
    return { success: false, error: 'Tên phần thưởng không được để trống.' };
  }

  const itemId = itemData.id || `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const normalizedItem: ShopItem = {
    id: itemId,
    name,
    description: itemData.description || '',
    price: Math.max(1, Number(itemData.price) || 10),
    tier: itemData.tier || 'common',
    icon: itemData.icon || '🎁',
    targetMinutes: Math.max(0, Number(itemData.targetMinutes) || 0),
    history: itemData.history || {},
    verdict: itemData.verdict || 'Phần thưởng tự tạo khích lệ tinh thần.',
    signature: itemData.signature || '',
  };

  const state = await fetchUserState(user.sub);
  const existingIdx = state.shopItems.findIndex(s => s.id === itemId);
  if (existingIdx >= 0) {
    state.shopItems[existingIdx] = { ...state.shopItems[existingIdx], ...normalizedItem };
  } else {
    state.shopItems.unshift(normalizedItem);
  }
  state.shopItems = dedupeById(state.shopItems);

  await commitUserState(user.sub, state);
  return { success: true, data: normalizedItem };
}

/**
 * Server Action: Delete Shop Item (Reward)
 */
export async function deleteShopItemAction(
  itemId: string,
  sessionToken?: string
): Promise<ActionResponse<{ id: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  if (!itemId || typeof itemId !== 'string') {
    return { success: false, error: 'Mã phần thưởng không hợp lệ.' };
  }

  const state = await fetchUserState(user.sub);
  state.shopItems = state.shopItems.filter(s => s.id !== itemId);
  await commitUserState(user.sub, state);

  return { success: true, data: { id: itemId } };
}

/**
 * Server Action: Create or Update Note
 */
export async function saveNoteAction(
  noteData: Partial<NoteItem>,
  sessionToken?: string
): Promise<ActionResponse<NoteItem>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  if (!noteData || typeof noteData !== 'object' || Array.isArray(noteData)) {
    return { success: false, error: 'Dữ liệu ghi chú không hợp lệ.' };
  }
  for (const field of ['id', 'title', 'content', 'topic'] as const) {
    if (noteData[field] !== undefined && typeof noteData[field] !== 'string') {
      return { success: false, error: `Trường ${field} của ghi chú không hợp lệ.` };
    }
  }

  const normalizedNote = await saveNote(user.sub, noteData);
  return { success: true, data: normalizedNote };
}

/**
 * Server Action: Delete Note
 */
export async function deleteNoteAction(
  noteId: string,
  sessionToken?: string
): Promise<ActionResponse<{ id: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  if (!noteId || typeof noteId !== 'string' || !noteId.trim()) {
    return { success: false, error: 'Mã ghi chú không hợp lệ.' };
  }

  await removeNote(user.sub, noteId.trim());

  return { success: true, data: { id: noteId.trim() } };
}

/**
 * Server Action: Get Current User State
 */
export async function getUserStateAction(
  sessionToken?: string
): Promise<ActionResponse<LevelUpAppState>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
  }

  const state = await fetchUserState(user.sub);
  state.notes = await listNotes(user.sub);
  state.activeNoteId = state.notes.some(note => note.id === state.activeNoteId)
    ? state.activeNoteId
    : (state.notes[0]?.id || '');
  state.focusNotes = state.notes.find(note => note.id === state.activeNoteId)?.content || '';
  return { success: true, data: state };
}
