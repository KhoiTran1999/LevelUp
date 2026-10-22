'use server';

import crypto from 'node:crypto';
import { dedupeById } from '@/lib/server/crypto';
import type { Quest, ShopItem, NoteItem, LevelUpAppState } from '@/types/levelup';
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

  const noteId = (noteData.id || `note_${crypto.randomUUID()}`).trim();
  const normalizedNote: NoteItem = {
    id: noteId,
    title: (noteData.title || '').trim() || 'Ghi Chú Mới',
    content: noteData.content ?? '',
    topic: noteData.topic || 'Ghi Chép Nhanh',
    isPinned: Boolean(noteData.isPinned || noteData.pinned),
    pinned: Boolean(noteData.isPinned || noteData.pinned),
    updatedAt: Date.now(),
    createdAt: noteData.createdAt || Date.now(),
  };

  const state = await fetchUserState(user.sub);
  if (!Array.isArray(state.notes)) {
    state.notes = [];
  }
  const existingIdx = state.notes.findIndex(n => n.id === noteId);
  if (existingIdx >= 0) {
    state.notes[existingIdx] = { ...state.notes[existingIdx], ...normalizedNote };
  } else {
    state.notes.unshift(normalizedNote);
  }
  state.notes = dedupeById(state.notes);

  await commitUserState(user.sub, state);
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

  if (!noteId || typeof noteId !== 'string') {
    return { success: false, error: 'Mã ghi chú không hợp lệ.' };
  }

  const state = await fetchUserState(user.sub);
  if (Array.isArray(state.notes)) {
    state.notes = state.notes.filter(n => n.id !== noteId);
  }
  await commitUserState(user.sub, state);

  return { success: true, data: { id: noteId } };
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
  return { success: true, data: state };
}
