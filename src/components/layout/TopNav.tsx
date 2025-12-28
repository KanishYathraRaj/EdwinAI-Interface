import { Link2, CheckCircle } from "lucide-react";
import { Tab } from "../../types";

interface TopNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onConnectClassroom: () => void;
  hasSubject: boolean;
  gcrCourseId?: string | null;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "research", label: "Research" },
  { id: "documentation", label: "Documentation" },
  { id: "syllabus", label: "Syllabus" },
  { id: "question-bank", label: "Question Bank" },
  { id: "students", label: "Students" },
];

export function TopNav({
  activeTab,
  onTabChange,
  onConnectClassroom,
  hasSubject,
  gcrCourseId,
}: TopNavProps) {
  const connected = !!(hasSubject && gcrCourseId);

  const buttonLabel = connected ? "Change Classroom" : "Connect to Classroom";
  const buttonTitle = connected
    ? `Change Classroom (connected: ${gcrCourseId ?? "unknown"})`
    : hasSubject
    ? "Connect to Classroom"
    : "Select a subject to enable";

  return (
    <div className="bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={!hasSubject && tab.id !== "research"}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "text-white bg-zinc-800"
                  : !hasSubject && tab.id !== "research"
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onConnectClassroom}
          disabled={!hasSubject}
          title={buttonTitle}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            hasSubject
              ? "text-white bg-zinc-800 hover:bg-zinc-700"
              : "text-gray-600 bg-transparent cursor-not-allowed"
          }`}
        >
          {connected ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              {buttonLabel}
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
