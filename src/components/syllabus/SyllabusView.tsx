import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchSubject } from "../../lib/firestoreHelpers";
import { Syllabus } from "../../types";

interface SyllabusViewProps {
  subjectId: string;
}

export function SyllabusView({ subjectId }: SyllabusViewProps) {
  const { user } = useAuth();
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyllabus();
  }, [subjectId, user?.uid]);

  const loadSyllabus = async () => {
    if (!user || !subjectId) {
      setSyllabus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const subject = await fetchSubject(user.uid, subjectId);
      setSyllabus(subject?.syllabus ?? null);
    } catch (err) {
      console.error("Error loading syllabus:", err);
      setSyllabus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading syllabus...</p>
      </div>
    );
  }

  if (!syllabus) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          No syllabus found. Upload a syllabus PDF to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-4">
          {syllabus.course_title || "Syllabus"}
        </h2>

        <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
          {(syllabus.units || []).map((unit, idx) => (
            <div key={idx} className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">{`Unit ${unit.unit_number}: ${unit.unit_title}`}</h3>
              </div>
              <ul className="list-disc list-inside text-gray-300">
                {(unit.topics || []).map((topic, tIdx) => (
                  <li key={tIdx} className="text-sm">
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
