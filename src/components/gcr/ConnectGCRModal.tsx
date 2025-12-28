import { useEffect, useState } from "react";
import { updateSubject } from "../../lib/firestoreHelpers";

interface Course {
  id: string;
  name?: string;
}

interface ConnectGCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  subjectId: string;
  onLinked?: () => void;
}

export function ConnectGCRModal({
  isOpen,
  onClose,
  userId,
  subjectId,
  onLinked,
}: ConnectGCRModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchCourses();
  }, [isOpen]);

  const fetchCourses = async () => {
    setError(null);
    setLoading(true);
    try {
      const API_BASE =
        (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";
      const resp = await fetch(`${API_BASE}/gcr/courses`);
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(
          "Received HTML response from server (is backend running or proxy configured?)"
        );
      }
      if (!resp.ok) throw new Error("Failed to fetch courses");
      const data = await resp.json();
      setCourses((data.courses || []) as Course[]);
    } catch (e: any) {
      console.error("Failed fetching courses", e);
      setError(e?.message ?? "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (courseId: string) => {
    setLinking(courseId);
    setError(null);
    try {
      await updateSubject(userId, subjectId, { gcr_course_id: courseId });
      if (onLinked) onLinked();
      onClose();
    } catch (e: any) {
      console.error("Failed to link course", e);
      setError(e?.message ?? "Failed to link course");
    } finally {
      setLinking(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-zinc-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Connect to Google Classroom
          </h3>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading courses…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : courses.length === 0 ? (
          <div className="text-gray-400">No courses found.</div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-auto">
            {courses.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between bg-zinc-800 rounded p-3"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {c.name ?? "Untitled Course"}
                  </div>
                  <div className="text-xs text-gray-400">{c.id}</div>
                </div>
                <div>
                  <button
                    onClick={() => handleSelect(c.id)}
                    disabled={!!linking}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    {linking === c.id ? "Linking…" : "Select"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectGCRModal;
