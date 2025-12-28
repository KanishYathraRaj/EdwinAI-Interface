import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./components/auth/AuthPage";
import { MainLayout } from "./components/layout/MainLayout";
import { CreateSubjectModal } from "./components/subjects/CreateSubjectModal";
import { ChatInterface } from "./components/chat/ChatInterface";
import { SyllabusView } from "./components/syllabus/SyllabusView";
import DocumentationView from "./components/documentation/DocumentationView";
import { QuestionBankView } from "./components/questions/QuestionBankView";
import { StudentsView } from "./components/students/StudentsView";
import { useSubjects } from "./hooks/useSubjects";
import { Subject, Tab } from "./types";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { subjects, createSubject } = useSubjects(user?.uid || null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("research");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentChatSession, setCurrentChatSession] = useState<string | null>(
    null
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleCreateSubject = async (
    title: string,
    description: string,
    syllabusFile: File | null
  ) => {
    const newSubject = await createSubject(title, description, null);
    setSelectedSubject(newSubject);
    setActiveTab("research");

    if (syllabusFile) {
      try {
        const form = new FormData();
        form.append("user_id", user!.uid);
        form.append("subject_id", newSubject.id);
        form.append("file", syllabusFile);

        const resp = await fetch("http://localhost:5000/upsert_syllabus", {
          method: "POST",
          body: form,
        });

        if (!resp.ok) {
          const err = await resp
            .json()
            .catch(() => ({ error: "Upload failed" }));
          console.error("Syllabus upload failed", err);
        } else {
          setActiveTab("syllabus");
        }
      } catch (e) {
        console.error("Error uploading syllabus:", e);
      }
    }
  };

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setActiveTab("research");
    setCurrentChatSession(null);
  };

  const handleGeneralClick = () => {
    setSelectedSubject(null);
    setActiveTab("research");
    setCurrentChatSession(null);
  };

  const handleConnectClassroom = () => {
    alert("Google Classroom integration coming soon!");
  };

  const renderContent = () => {
    if (!selectedSubject && activeTab !== "research") {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Please select a subject to continue</p>
        </div>
      );
    }

    switch (activeTab) {
      case "research":
        return (
          <ChatInterface
            sessionId={currentChatSession}
            subjectId={selectedSubject?.id || null}
            userId={user.uid}
          />
        );
      case "syllabus":
        return selectedSubject ? (
          <SyllabusView subjectId={selectedSubject.id} />
        ) : null;
      case "documentation":
        return selectedSubject ? (
          <DocumentationView subjectId={selectedSubject.id} />
        ) : null;
      case "question-bank":
        return selectedSubject ? (
          <QuestionBankView
            subjectId={selectedSubject.id}
            subjectTitle={
              selectedSubject.subject_name ?? selectedSubject.title ?? ""
            }
          />
        ) : null;
      case "students":
        return selectedSubject ? (
          <StudentsView subjectId={selectedSubject.id} />
        ) : null;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <>
      <MainLayout
        subjects={subjects}
        selectedSubject={selectedSubject}
        activeTab={activeTab}
        onSelectSubject={handleSelectSubject}
        onNewSubject={() => setIsCreateModalOpen(true)}
        onGeneralClick={handleGeneralClick}
        onTabChange={setActiveTab}
        onConnectClassroom={handleConnectClassroom}
      >
        {renderContent()}
      </MainLayout>

      <CreateSubjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSubject}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
