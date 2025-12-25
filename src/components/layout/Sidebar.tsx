import { GraduationCap, Home, Plus, Search } from 'lucide-react';
import { Subject } from '../../types';

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
                ? 'bg-zinc-800 text-white'
                : 'text-gray-400 hover:bg-zinc-800 hover:text-white'
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
                      ? 'bg-zinc-800 text-white'
                      : 'text-gray-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium truncate block">
                    {subject.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Teacher</p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
