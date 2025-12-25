import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subject } from '../types';

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
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (title: string, description: string, syllabusUrl: string | null) => {
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        title,
        description,
        syllabus_url: syllabusUrl,
        google_classroom_id: null,
      })
      .select()
      .single();

    if (error) throw error;
    setSubjects((prev) => [data, ...prev]);
    return data;
  };

  const deleteSubject = async (subjectId: string) => {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) throw error;
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
