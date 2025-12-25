import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Subject, Tab } from '../../types';

interface MainLayoutProps {
  children: ReactNode;
  subjects: Subject[];
  selectedSubject: Subject | null;
  activeTab: Tab;
  onSelectSubject: (subject: Subject) => void;
  onNewSubject: () => void;
  onGeneralClick: () => void;
  onTabChange: (tab: Tab) => void;
  onConnectClassroom: () => void;
}

export function MainLayout({
  children,
  subjects,
  selectedSubject,
  activeTab,
  onSelectSubject,
  onNewSubject,
  onGeneralClick,
  onTabChange,
  onConnectClassroom,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <Sidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelectSubject={onSelectSubject}
        onNewSubject={onNewSubject}
        onGeneralClick={onGeneralClick}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          onConnectClassroom={onConnectClassroom}
          hasSubject={!!selectedSubject}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
