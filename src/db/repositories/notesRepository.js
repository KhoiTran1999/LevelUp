import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '../index.js';

const { notes } = schema;

export async function getNotesByUser(userId) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, String(userId)))
    .orderBy(asc(notes.createdAt));
}

export async function createNote(userId, note) {
  const db = getDb();
  if (!db) return null;
  const [created] = await db.insert(notes).values({
    id: String(note.id),
    userId: String(userId),
    title: String(note.title),
    content: String(note.content || ''),
    category: String(note.topic || 'Ghi Chép Nhanh').slice(0, 64),
    isPinned: Boolean(note.isPinned ?? note.pinned),
    createdAt: new Date(note.createdAt || Date.now()),
    updatedAt: new Date(note.updatedAt || Date.now()),
  }).returning();
  return created || null;
}

export async function updateNote(userId, note) {
  const db = getDb();
  if (!db) return null;
  const [updated] = await db.update(notes).set({
    title: String(note.title),
    content: String(note.content || ''),
    category: String(note.topic || 'Ghi Chép Nhanh').slice(0, 64),
    isPinned: Boolean(note.isPinned ?? note.pinned),
    updatedAt: new Date(note.updatedAt || Date.now()),
  }).where(and(eq(notes.id, String(note.id)), eq(notes.userId, String(userId)))).returning();
  return updated || null;
}

export async function deleteNote(userId, noteId) {
  const db = getDb();
  if (!db) return;
  await db.delete(notes).where(and(eq(notes.id, String(noteId)), eq(notes.userId, String(userId))));
}
