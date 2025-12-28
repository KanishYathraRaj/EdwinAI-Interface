import { useState, useEffect } from 'react';
import { Subject } from '../types';
import { createSubjectInUser, fetchSubjectsForUser } from '../lib/firestoreHelpers';

export function useSubjects(userId: string | null) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [userId]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      if (!userId) return;

      const subjectsData = await fetchSubjectsForUser(userId);
      // sort by created_at desc if available
      subjectsData.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
      setSubjects(subjectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (title: string, description: string, _syllabusUrl: string | null) => {
    if (!userId) throw new Error('User not authenticated');

    const payload: Partial<Subject> = {
      subject_name: title,
      title,
      description,
      resources: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await createSubjectInUser(userId, payload);
    setSubjects((prev) => [created, ...prev]);
    return created;
  };

  const deleteSubject = async (subjectId: string) => {
    // delete from users/{uid}/subjects/{subjectId} requires user context; implement when deletion helper is added
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
  };

  return {
    subjects,
    loading,
    error,
    createSubject,
    deleteSubject,
    refreshSubjects: loadSubjects,
  };
}
