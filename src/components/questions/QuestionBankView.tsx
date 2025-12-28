import { useState, useEffect } from "react";
import { Download, Upload } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchSubject } from "../../lib/firestoreHelpers";
import { QuestionBank } from "../../types";

interface QuestionBankViewProps {
  subjectId: string;
  subjectTitle: string;
}

export function QuestionBankView({
  subjectId,
  subjectTitle,
}: QuestionBankViewProps) {
  const { user } = useAuth();
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    loadQuestionBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, user?.uid]);

  const loadQuestionBank = async () => {
    setError(null);
    if (!user || !subjectId) {
      setQuestionBank(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const subject = await fetchSubject(user.uid, subjectId);
      setQuestionBank(
        (subject && (subject.question_bank as QuestionBank | undefined)) ?? null
      );
    } catch (err) {
      console.error("Error loading question bank:", err);
      setError("Failed to load question bank");
      setQuestionBank(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError(null);

    try {
      const body = {
        user_id: user.uid,
        subject_id: subjectId,
        user_subject_json: {
          subject_name: subjectTitle,
        },
      };

      const resp = await fetch("http://localhost:5000/generate_question_bank", {
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

      // Backend writes the question_bank into Firestore; refresh to pick it up
      await loadQuestionBank();
    } catch (e: any) {
      console.error("Error generating question bank:", e);
      setError(e?.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!questionBank || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:5000/download_question_bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionBank),
      });

      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ error: "Download failed" }));
        throw new Error(err.error || "Download failed");
      }

      const blob = await resp.blob();

      // infer filename from content-disposition or fall back
      let filename = `${(questionBank.course_title ?? subjectTitle)
        .toUpperCase()
        .replace(/\s+/g, "_")}_question_bank.pdf`;
      const cd =
        resp.headers.get("Content-Disposition") ||
        resp.headers.get("content-disposition");
      if (cd) {
        const m = /filename\*?=(?:UTF-8''")?"?([^";]+)"?/.exec(cd);
        if (m && m[1]) filename = decodeURIComponent(m[1]);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Download error:", e);
      setError(e?.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading question bank...</p>
      </div>
    );
  }

  if (!questionBank) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            No question bank found for this subject.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            {generating ? "Generating..." : "Generate question bank"}
          </button>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white text-left md:text-left">
            {subjectTitle.toUpperCase()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Preparing PDF..." : "Download"}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm">
              <Upload className="w-4 h-4" />
              Upload to GCR
            </button>
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-md"
            >
              {showRaw ? "Hide raw" : "Show raw JSON"}
            </button>
          </div>

          {error && <p className="text-red-400 mt-2">{error}</p>}

          {/* end header actions */}
        </div>

        {showRaw && (
          <div className="bg-zinc-900 rounded-md p-4 mb-6 w-full">
            <h4 className="text-sm text-gray-300 font-medium mb-2">
              Raw question_bank JSON
            </h4>
            <pre className="text-xs text-gray-200 overflow-auto max-h-60 whitespace-pre-wrap">
              {JSON.stringify(questionBank, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-2 grid grid-cols-1 gap-6">
          {(questionBank!.units || []).map((unit: any, idx: number) => (
            <div
              key={unit.unit_number ?? idx}
              className="bg-zinc-900 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                UNIT {unit.unit_number}: {unit.unit_title}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-200">
                    2 Marks Questions
                  </h4>
                  <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-300">
                    {(unit["2_marks"] || []).map((q: string, i: number) => (
                      <li key={`2-${i}`} className="text-sm leading-relaxed">
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-200">
                    16 Marks Questions
                  </h4>
                  <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-300">
                    {(unit["16_marks"] || []).map((q: string, i: number) => (
                      <li key={`16-${i}`} className="text-sm leading-relaxed">
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
