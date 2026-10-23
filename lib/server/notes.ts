import crypto from 'node:crypto';
import { getRedis } from '@/lib/server/redis';
import { isDbConfigured } from '../../src/db/index.js';
import {
  createNote,
  deleteNote,
  getNotesByUser,
  updateNote,
} from '../../src/db/repositories/notesRepository.js';
import type { NoteItem } from '@/types/levelup';

const notesKey = (userSub: string) => `levelup:notes:${userSub}`;
const noteWriteQueues = new Map<string, Promise<void>>();

function enqueueNoteWrite<T>(userSub: string, operation: () => Promise<T>): Promise<T> {
  const previous = noteWriteQueues.get(userSub) || Promise.resolve();
  const queued = previous.then(operation, operation);
  const queueTail = queued.then(
    () => undefined,
    () => undefined
  );
  noteWriteQueues.set(userSub, queueTail);
  queueTail.then(() => {
    if (noteWriteQueues.get(userSub) === queueTail) noteWriteQueues.delete(userSub);
  });
  return queued;
}

function normalizeNote(input: Partial<NoteItem>, existing?: NoteItem): NoteItem {
  const now = Date.now();
  const pinned = input.isPinned ?? input.pinned ?? existing?.isPinned ?? existing?.pinned ?? false;
  return {
    id: (input.id || existing?.id || `note_${crypto.randomUUID()}`).trim(),
    title: input.title !== undefined ? input.title.trim() || 'Ghi Chú Mới' : existing?.title || 'Ghi Chú Mới',
    content: input.content !== undefined ? input.content : existing?.content || '',
    topic: input.topic !== undefined ? input.topic : existing?.topic || 'Ghi Chép Nhanh',
    pinned: Boolean(pinned),
    isPinned: Boolean(pinned),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
}

async function readRedisNotes(userSub: string): Promise<NoteItem[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(notesKey(userSub));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeRedisNotes(userSub: string, notes: NoteItem[]): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.set(notesKey(userSub), JSON.stringify(notes));
}

export async function listNotes(userSub: string): Promise<NoteItem[]> {
  const redisNotes = await readRedisNotes(userSub);
  if (redisNotes !== null) return redisNotes;
  if (!isDbConfigured()) return [];
  return (await getNotesByUser(userSub)).map(note => ({
    id: note.id,
    title: note.title,
    content: note.content || '',
    topic: note.category || 'Ghi Chép Nhanh',
    pinned: Boolean(note.isPinned),
    isPinned: Boolean(note.isPinned),
    createdAt: note.createdAt?.getTime() || Date.now(),
    updatedAt: note.updatedAt?.getTime() || Date.now(),
  }));
}

export async function saveNote(
  userSub: string,
  input: Partial<NoteItem>
): Promise<NoteItem> {
  return enqueueNoteWrite(userSub, async () => {
    const notes = await listNotes(userSub);
    const existing = input.id ? notes.find(note => note.id === input.id) : undefined;
    const note = normalizeNote(input, existing);
    const next = existing
      ? notes.map(item => item.id === note.id ? note : item)
      : [note, ...notes];

    await writeRedisNotes(userSub, next);
    if (isDbConfigured()) {
      if (existing) await updateNote(userSub, note);
      else await createNote(userSub, note);
    }
    return note;
  });
}

export async function removeNote(userSub: string, id: string): Promise<void> {
  await enqueueNoteWrite(userSub, async () => {
    const notes = await listNotes(userSub);
    await writeRedisNotes(userSub, notes.filter(note => note.id !== id));
    if (isDbConfigured()) await deleteNote(userSub, id);
  });
}
