import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Student } from '../../types';

interface StudentsViewProps {
  subjectId: string;
}

export function StudentsView({ subjectId }: StudentsViewProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [subjectId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const q = query(
        collection(db, 'students'),
        where('subject_id', '==', subjectId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Students</h2>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-8 text-center">
            <p className="text-red-500 font-semibold mb-2">Failed to Fetch Students</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-zinc-900 rounded-lg p-8 text-center">
            <p className="text-gray-500">No students found in this course.</p>
            <p className="text-sm text-gray-600 mt-2">
              Connect to Google Classroom to import students
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-zinc-800 border-b border-zinc-700">
              <div className="text-sm font-semibold text-gray-300">Name</div>
              <div className="text-sm font-semibold text-gray-300">Email</div>
            </div>
            <div className="divide-y divide-zinc-800">
              {students.map((student) => (
                <div key={student.id} className="grid grid-cols-2 gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="text-sm text-gray-300">{student.name}</div>
                  <div className="text-sm text-gray-400">{student.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
