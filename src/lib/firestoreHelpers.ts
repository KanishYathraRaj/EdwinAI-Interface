import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Subject, ConversationEntry } from '../types';

export function getSubjectsCollection(userId: string) {
  return collection(db, 'users', userId, 'subjects');
}

export function getSubjectDocRef(userId: string, subjectId: string) {
  return doc(db, 'users', userId, 'subjects', subjectId);
}

export async function createSubjectInUser(userId: string, data: Partial<Subject>): Promise<Subject> {
  const created_at = new Date().toISOString();
  const payload = {
    ...data,
    created_at,
    updated_at: created_at,
  } as Record<string, unknown>;

  // Remove undefined values — Firestore does not accept fields with value `undefined`.
  const sanitized: Record<string, unknown> = Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined)
  );

  const ref = await addDoc(getSubjectsCollection(userId), sanitized);
  const snap = await getDoc(ref);

  return { id: ref.id, user_id: userId, ...(snap.data() as any) } as Subject;
}

export async function fetchSubjectsForUser(userId: string): Promise<Subject[]> {
  const col = getSubjectsCollection(userId);
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, user_id: userId, ...(d.data() as any) })) as Subject[];
}

// conversation helpers — two strategies
export async function appendConversationEntryArray(userId: string, subjectId: string, entry: ConversationEntry) {
  const ref = getSubjectDocRef(userId, subjectId);
  // using updateDoc + arrayUnion would be another approach; here we fetch-modify-update
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('subject not found');
  const data = snap.data();
  const history = (data?.conversation_history as ConversationEntry[] | undefined) ?? [];
  const newHistory = [...history, { ...entry, created_at: new Date().toISOString() }];
  await updateDoc(ref, { conversation_history: newHistory, updated_at: new Date().toISOString() });
}

export async function addConversationDoc(userId: string, subjectId: string, entry: ConversationEntry) {
  const conversationCol = collection(db, 'users', userId, 'subjects', subjectId, 'conversation');
  const payload = { ...entry, created_at: new Date().toISOString() };
  const ref = await addDoc(conversationCol, payload);
  return ref.id;
}

export async function fetchConversationDocs(userId: string, subjectId: string) {
  const col = collection(db, 'users', userId, 'subjects', subjectId, 'conversation');
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function fetchSubject(userId: string, subjectId: string): Promise<Subject | null> {
  const ref = getSubjectDocRef(userId, subjectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, user_id: userId, ...(snap.data() as any) } as Subject;
}

export async function updateSubject(userId: string, subjectId: string, patch: Partial<Subject>) {
  const ref = getSubjectDocRef(userId, subjectId);
  await updateDoc(ref, { ...patch, updated_at: new Date().toISOString() });
}

export default {
  getSubjectsCollection,
  getSubjectDocRef,
  createSubjectInUser,
  fetchSubjectsForUser,
  appendConversationEntryArray,
  addConversationDoc,
  fetchConversationDocs,
  fetchSubject,
  updateSubject,
};
