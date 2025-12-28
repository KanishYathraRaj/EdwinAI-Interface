import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchSubject } from "../../lib/firestoreHelpers";

interface DocumentationViewProps {
  subjectId: string;
}

export function DocumentationView({ subjectId }: DocumentationViewProps) {
  const { user } = useAuth();
  const [documentation, setDocumentation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    loadDocumentation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, user?.uid]);

  const loadDocumentation = async () => {
    setError(null);
    if (!user || !subjectId) {
      setDocumentation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const subject = await fetchSubject(user.uid, subjectId);
      setDocumentation(
        (subject && (subject.documentation as any | undefined)) ?? null
      );
    } catch (err) {
      console.error("Error loading documentation:", err);
      setError("Failed to load documentation");
      setDocumentation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError(null);

    try {
      // fetch latest subject to include syllabus if present
      const subject = await fetchSubject(user.uid, subjectId);

      const body = {
        user_id: user.uid,
        subject_id: subjectId,
        user_subject_json: subject ?? { subject_name: subjectId },
      };

      const resp = await fetch("http://localhost:5000/generate_documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }

      // Backend writes the documentation into Firestore; refresh
      await loadDocumentation();
    } catch (e: any) {
      console.error("Error generating documentation:", e);
      setError(e?.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading documentation...</p>
      </div>
    );
  }

  if (!documentation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            No documentation found for this subject.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            {generating ? "Generating..." : "Generate documentation"}
          </button>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  // Render documentation in a readable format (as per expected schema)
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {(documentation.course_title || "Documentation").toUpperCase()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
            >
              {generating ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-md"
            >
              {showRaw ? "Hide raw" : "Show raw JSON"}
            </button>
          </div>
        </div>

        {showRaw && (
          <div className="bg-zinc-900 rounded-md p-4 mb-6 w-full">
            <pre className="text-xs text-gray-200 overflow-auto max-h-72 whitespace-pre-wrap">
              {JSON.stringify(documentation, null, 2)}
            </pre>
          </div>
        )}

        {documentation.overview && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Overview</h3>
            <p className="text-gray-300 mt-2">{documentation.overview}</p>
          </div>
        )}

        <div className="space-y-6">
          {(documentation.units || []).map((unit: any, idx: number) => (
            <div
              key={unit.unit_number ?? idx}
              className="bg-zinc-900 rounded-lg p-6"
            >
              <h4 className="text-lg font-semibold text-white">
                UNIT {unit.unit_number}: {unit.unit_title}
              </h4>
              {unit.unit_summary && (
                <p className="text-gray-300 mt-2">{unit.unit_summary}</p>
              )}

              <div className="mt-4 space-y-4">
                {(unit.topics || []).map((topic: any, tIdx: number) => (
                  <div key={tIdx} className="bg-zinc-800 rounded-md p-4">
                    <h5 className="text-sm font-semibold text-white">
                      {topic.topic_title}
                    </h5>
                    {topic.explanation && (
                      <p className="text-gray-300 mt-2">{topic.explanation}</p>
                    )}
                    {topic.examples && topic.examples.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-300 font-medium">
                          Examples
                        </div>
                        <ul className="list-disc list-inside text-gray-300 mt-1 text-sm">
                          {topic.examples.map((ex: string, i: number) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {topic.real_world_applications &&
                      topic.real_world_applications.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-300 font-medium">
                            Applications
                          </div>
                          <ul className="list-disc list-inside text-gray-300 mt-1 text-sm">
                            {topic.real_world_applications.map(
                              (app: string, i: number) => (
                                <li key={i}>{app}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {topic.summary && (
                      <p className="text-gray-400 mt-2 text-sm">
                        {topic.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocumentationView;
