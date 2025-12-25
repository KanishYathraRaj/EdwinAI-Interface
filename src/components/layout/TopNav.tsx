import { Link2 } from 'lucide-react';
import { Tab } from '../../types';

interface TopNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onConnectClassroom: () => void;
  hasSubject: boolean;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'syllabus', label: 'Syllabus' },
  { id: 'question-bank', label: 'Question Bank' },
  { id: 'students', label: 'Students' },
];

export function TopNav({ activeTab, onTabChange, onConnectClassroom, hasSubject }: TopNavProps) {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={!hasSubject && tab.id !== 'research'}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-white bg-zinc-800'
                  : !hasSubject && tab.id !== 'research'
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onConnectClassroom}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect to Classroom
        </button>
      </div>
    </div>
  );
}
