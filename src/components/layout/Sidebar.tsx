import {
  GraduationCap,
  Home,
  Plus,
  Search,
  LogOut,
  Settings,
  HelpCircle,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Subject } from "../../types";

interface SidebarProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (subject: Subject) => void;
  onNewSubject: () => void;
  onGeneralClick: () => void;
}

export function Sidebar({
  subjects,
  selectedSubject,
  onSelectSubject,
  onNewSubject,
  onGeneralClick,
}: SidebarProps) {
  return (
    <div className="w-64 bg-zinc-900 h-screen flex flex-col border-r border-zinc-800">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-white">EdwinAI</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          <button
            onClick={onGeneralClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              !selectedSubject
                ? "bg-zinc-800 text-white"
                : "text-gray-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">General</span>
          </button>

          <button
            onClick={onNewSubject}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">New subject</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-800 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
            <span className="text-sm font-medium">Search</span>
          </button>
        </div>

        {subjects.length > 0 && (
          <div className="px-3 py-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              Subjects
            </h2>
            <div className="space-y-1">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => onSelectSubject(subject)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedSubject?.id === subject.id
                      ? "bg-zinc-800 text-white"
                      : "text-gray-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-medium truncate block">
                    {subject.subject_name ?? subject.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <ProfileRow />
      </div>
    </div>
  );
}

function ProfileRow() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch (err) {
      console.error("Error signing out", err);
    }
  };

  const displayName = profile?.full_name ?? user?.displayName ?? "User";
  const emailHandle = user?.email?.split("@")[0] ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        aria-haspopup
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {displayName.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-500">Free Plan</p>
        </div>
        <div className="text-sm">
          <button className="bg-zinc-800 px-2 py-1 rounded text-xs">
            Upgrade
          </button>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 bottom-16 w-64 bg-zinc-900 rounded-xl shadow-lg p-3 z-50 text-sm border border-zinc-800">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium text-white">{displayName}</div>
              <div className="text-xs text-gray-500">@{emailHandle}</div>
            </div>
          </div>

          <div className="mt-2">
            <button className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 flex items-center gap-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Upgrade plan</span>
            </button>

            <button className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 flex items-center gap-3">
              <span className="text-gray-300">🎨</span>
              <span>Personalization</span>
            </button>

            <button className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4" />
                <span>Help</span>
              </div>
              <span className="text-gray-400">&gt;</span>
            </button>
          </div>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 flex items-center gap-3 text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
