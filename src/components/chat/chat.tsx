'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Chat, Message, Assessment, QuestionBankHistory } from '@/lib/types';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChatWelcome } from './ChatWelcome';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '../ui/button';
import SyllabusDisplay from './SyllabusDisplay';
import QuestionBankDisplay from './QuestionBankDisplay';
import GenerateQuestionBankForm from './GenerateQuestionBankForm';
import DocumentationDisplay from './DocumentationDisplay';
import { cn, handleApiResponse, GcrAuthError } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Download, Link as LinkIcon, ExternalLink, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { triggerGcrAuth, publishToGcr } from '@/lib/gcr';
import { useGcr } from '@/contexts/gcr-context';
import StudentsDisplay from './StudentsDisplay';
import GenerateAssessmentForm from './GenerateAssessmentForm';
import AssessmentDetails from './AssessmentDetails';
import SubjectDetails from './SubjectDetails';
import BatchDetails from './BatchDetails';
import { Subject, Batch } from '@/types/database';

interface ChatProps {
  data: Subject | Batch | undefined;
  type: 'subject' | 'batch';
  subjects?: Subject[];
  batches?: Batch[];
  onNewChat: () => void;
  initialView?: string;
  onNewBatch?: (subjectId: string) => void;
  onSelectBatch?: (batchId: string) => void;
}

export default function ChatComponent({
  data,
  type,
  subjects = [],
  batches = [],
  onNewChat,
  initialView = 'details',
  onNewBatch,
  onSelectBatch
}: ChatProps) {
  // Map 'data' to internal naming for compatibility
  const chat = data as any;
  const normalizeView = (view: string) => {
    const v = view === 'subject' ? 'details' : view;
    if (type === 'batch' && (v === 'schedule' || v === 'gcr')) return 'details';
    return v;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState(normalizeView(initialView));

  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [isCreatingQuestionBank, setIsCreatingQuestionBank] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);

  const [questionBanks, setQuestionBanks] = useState<QuestionBankHistory[]>([]);
  const [isQuestionBanksLoading, setIsQuestionBanksLoading] = useState(false);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState<QuestionBankHistory | null>(null);
  const parentSubject = useMemo(() => {
    if (type === 'subject') return chat as Subject;
    const batch = chat as Batch;
    return subjects.find((s) => s.id === batch.subject_id);
  }, [type, chat, subjects]);
  const subjectScopeId = parentSubject?.id || (type === 'subject' ? chat?.id : undefined);
  const subjectScopedChat = (parentSubject || chat) as any;

  const {
    courses: gcrCourses,
    studentsCache,
    isLoadingCourses: isCourseListLoading,
    loadingStudents,
    fetchCourses,
    fetchStudents,
    isGcrAuthDone,
    setGcrAuthDone,
    isAuthenticating,
    setIsAuthenticating,
    lastAuthError,
  } = useGcr();

  useEffect(() => {
    if (initialView) {
      setActiveView(normalizeView(initialView));
    }
  }, [initialView, chat?.id, type]); // Also sync when chat changes

  const gcrStudents = useMemo(() => {
    return chat?.gcr_course_id ? studentsCache[chat.gcr_course_id] || [] : [];
  }, [chat?.gcr_course_id, studentsCache]);

  const areStudentsLoading = useMemo(() => {
    return chat?.gcr_course_id ? !!loadingStudents[chat.gcr_course_id] : false;
  }, [chat?.gcr_course_id, loadingStudents]);


  useEffect(() => {
    console.log('[ChatComponent] Chat changed:', { id: chat?.id, name: chat?.subject_name, historyCount: chat?.conversation_history?.length });
    if (chat?.conversation_history) {
      setMessages(chat.conversation_history);
    } else {
      setMessages([]);
    }
    // We don't reset activeView here anymore, as it's managed by URL
    setSelectedAssessment(null);
    setIsCreatingAssessment(false);
    setIsCreatingQuestionBank(false);
  }, [chat]);

  useEffect(() => {
    if (initialView !== activeView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  // Unified Subject Data Context Fetching
  useEffect(() => {
    const fetchSubjectData = async () => {
      if (!chat?.id || !user) return;

      // 1. Fetch Assessments
      const collectionName = type === 'subject' ? 'subjects' : 'batches';
      if (type === 'batch' && (assessments.length === 0 || assessments[0]?.subjectId !== chat.id)) { // batch-level only
        setIsAssessmentsLoading(true);
        try {
          const assessmentsRef = collection(firestore, `users/${user.uid}/${collectionName}/${chat.id}/assessments`);
          const q = query(assessmentsRef, orderBy("created_at", "desc"));
          const querySnapshot = await getDocs(q);
          const history: Assessment[] = [];
          querySnapshot.forEach((doc) => {
            history.push({ id: doc.id, ...doc.data(), subjectId: chat.id } as any);
          });
          setAssessments(history.length > 0 ? history : (chat.latest_quiz ? [chat.latest_quiz] : []));
        } catch (e) { console.error("Error fetching assessments:", e); }
        finally { setIsAssessmentsLoading(false); }
      } else if (type === 'subject') {
        setAssessments([]);
      }

      // 2. Fetch Question Banks
      if (!subjectScopeId) return;
      if (questionBanks.length === 0 || (questionBanks[0] as any).subjectId !== subjectScopeId) {
        setIsQuestionBanksLoading(true);
        try {
          const qbRef = collection(firestore, `users/${user.uid}/subjects/${subjectScopeId}/question_banks`);
          const q = query(qbRef, orderBy("created_at", "desc"));
          const querySnapshot = await getDocs(q);
          const history: QuestionBankHistory[] = [];
          querySnapshot.forEach((doc) => {
            history.push({ id: doc.id, ...doc.data(), subjectId: subjectScopeId } as any);
          });
          setQuestionBanks(history.length > 0 ? history : (subjectScopedChat.latest_question_bank ? [subjectScopedChat.latest_question_bank] : []));
        } catch (e) { console.error("Error fetching question banks:", e); }
        finally { setIsQuestionBanksLoading(false); }
      }

      // 3. Fetch Students if GCR is linked
      if (chat.gcr_course_id && gcrStudents.length === 0 && !areStudentsLoading && !isAuthenticating && !lastAuthError) {
        try {
          await fetchStudents(chat.gcr_course_id);
        } catch (error: any) {
          if (error instanceof GcrAuthError) {
            handleGcrAuthRequired('Fetch Students');
          }
        }
      }
    };

    fetchSubjectData();
  }, [chat?.id, user, chat?.gcr_course_id, gcrStudents.length, areStudentsLoading, fetchStudents, isAuthenticating, lastAuthError, type, subjectScopeId, subjectScopedChat, assessments.length, questionBanks.length, firestore]);


  const handleGcrAuth = async () => {
    try {
      setIsAuthenticating(true);
      await triggerGcrAuth();
      setGcrAuthDone(true);
      toast({
        title: "Google Classroom: Check Backend",
        description: "Visit the URL shown in your backend terminal to complete authentication, then come back and retry.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "GCR Auth Failed",
        description: error.message || "Could not authenticate with Google Classroom.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  /** Auto-triggers GCR auth when a 401/INVALID_GRANT is detected. */
  const handleGcrAuthRequired = async (context: string) => {
    toast({
      variant: "destructive",
      title: `${context}: Authentication Required`,
      description: "Google OAuth token is missing or expired. Initiating re-authentication — check your backend terminal for a URL to visit.",
    });
    await handleGcrAuth();
  };

  // Fetch courses on mount to ensure "Link Course" is ready and names can be resolved
  useEffect(() => {
    if (type === 'batch' && gcrCourses.length === 0 && !isCourseListLoading && user) {
      fetchCourses();
    }
  }, [type, user, gcrCourses.length, isCourseListLoading, fetchCourses]);

  const handleLinkCourse = async (courseId: string) => {
    if (!chat || !user || type !== 'batch') return;
    const collName = 'batches';
    const docRef = doc(firestore, 'users', user.uid, collName, chat.id);
    await updateDoc(docRef, {
      gcr_course_id: courseId
    });
    toast({
      title: "Course Linked",
      description: "This batch is now linked to your Google Classroom course.",
    });
  };

  const handleSend = async (content: string, isGrounded: boolean) => {
    if (!chat || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: content,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const endpoint = 'http://127.0.0.1:5005/ask';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          subject_id: chat.id,
          subject_slug: type === 'subject' ? chat.slug : undefined,
          parent_type: type === 'subject' ? 'subjects' : 'batches',
          user_query: content,
          user_subject_json: chat,
          grounded: isGrounded,
        }),
      });

      const responseData = await handleApiResponse(response, endpoint);

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseData.reply,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'An error occurred',
        description: error.message || 'Failed to get a response from the AI. Please try again.',
        variant: 'destructive',
      });
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResourceUpload = async (file: File) => {
    if (!chat || !user) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'You must be in a chat session to upload a resource.',
      });
      return;
    }

    const subjectIdForResource = type === 'subject' ? chat.id : (chat as Batch).subject_id;
    const subjectSlugForResource = type === 'subject'
      ? (chat as Subject).slug
      : parentSubject?.slug;

    const formData = new FormData();
    formData.append('user_id', user.uid);
    formData.append('subject_id', subjectIdForResource);
    if (subjectSlugForResource) formData.append('subject_slug', subjectSlugForResource);
    formData.append('parent_type', type === 'subject' ? 'subjects' : 'batches');
    formData.append('file', file);

    toast({
      title: 'Uploading Resource',
      description: `Your file "${file.name}" is being processed...`,
    });

    try {
      const endpoint = 'http://127.0.0.1:5005/upsert_resources';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const responseData = await handleApiResponse(response, endpoint);
      toast({
        title: 'Upload Successful',
        description: responseData.message || 'Resource has been processed.',
      });
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not connect to the processing service.',
      });
    }
  };

  const handleGenerateQuestionBank = async () => {
    if (!chat || !user) return;
    if (!subjectScopeId || !subjectScopedChat?.syllabus) {
      toast({
        title: 'Missing Subject Syllabus',
        description: 'Question bank generation requires a subject syllabus.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const endpoint = 'http://127.0.0.1:5005/generate_question_bank';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          subject_id: subjectScopeId,
          subject_slug: parentSubject?.slug || (type === 'subject' ? chat.slug : undefined),
          parent_type: 'subjects',
          user_subject_json: subjectScopedChat,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      await handleApiResponse(response, endpoint);

      toast({
        title: "Question Bank Generation Started",
        description: "The question bank is being generated and will appear here shortly.",
      });

    } catch (error: any) {
      console.error('Error generating question bank:', error);
      toast({
        title: 'Error Generating Question Bank',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQuestionBank = async () => {
    if (!chat?.question_bank) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "No question bank data available to download.",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const endpoint = 'http://127.0.0.1:5005/download_question_bank';
      // Use raw fetch here — we need to call .blob() on the response body,
      // so we cannot pass through handleApiResponse which would consume the body as JSON.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chat.question_bank),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${chat.question_bank.course_title.replace(/\s+/g, '_') || 'question_bank'}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      a.download = filename;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your question bank PDF is downloading.",
      });

    } catch (error: any) {
      console.error('Error downloading question bank:', error);
      toast({
        title: 'Error Downloading Question Bank',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePublishToGcr = async (title: string, content: string, resourceType?: 'documentation' | 'question_bank' | 'assessment', resourceId?: string, onSuccess?: () => void) => {
    if (!chat || !user) return;
    const gcrCourseForResource = type === 'batch'
      ? chat.gcr_course_id
      : subjectScopedChat?.gcr_course_id;
    if (!gcrCourseForResource) {
      toast({
        variant: 'destructive',
        title: 'No Course Linked',
        description: resourceType === 'assessment'
          ? 'Please link this batch to a Google Classroom course first.'
          : 'Please link the subject to a Google Classroom course first.',
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishToGcr(gcrCourseForResource, title, content);
      toast({
        title: 'Published Successfully',
        description: (
          <div className="flex flex-col gap-2">
            {result.alternate_link && (
              <a
                href={result.alternate_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline flex items-center gap-1"
              >
                View in Classroom <ExternalLink size={10} />
              </a>
            )}
          </div>
        ),
      });

      // Update Firestore if we know the resource type
      const collectionName = type === 'subject' ? 'subjects' : 'batches';
      if (resourceType === 'documentation') {
        if (!subjectScopeId) throw new Error('Subject context not found for documentation.');
        const docRef = doc(firestore, `users/${user.uid}/subjects/${subjectScopeId}`);
        await updateDoc(docRef, { 'documentation.published_to_gcr': true });
        if (subjectScopedChat.documentation) subjectScopedChat.documentation.published_to_gcr = true;
      } else if (resourceType === 'question_bank' && resourceId) {
        const isAnswerKey = title.startsWith('Answer Key');
        const updateField = isAnswerKey ? 'answer_key_published_to_gcr' : 'published_to_gcr';
        if (!subjectScopeId) throw new Error('Subject context not found for question bank.');
        const docRef = doc(firestore, `users/${user.uid}/subjects/${subjectScopeId}/question_banks/${resourceId}`);
        await updateDoc(docRef, { [updateField]: true });
        const parentRef = doc(firestore, `users/${user.uid}/subjects/${subjectScopeId}`);
        if (subjectScopedChat.latest_question_bank?.id === resourceId) {
          await updateDoc(parentRef, { [`latest_question_bank.${updateField}`]: true });
        }
        if (selectedQuestionBank && selectedQuestionBank.id === resourceId) {
          if (isAnswerKey) {
            selectedQuestionBank.answer_key_published_to_gcr = true;
            if (selectedQuestionBank.content) selectedQuestionBank.content.answer_key_published_to_gcr = true;
          } else {
            selectedQuestionBank.published_to_gcr = true;
            if (selectedQuestionBank.content) selectedQuestionBank.content.published_to_gcr = true;
          }
        }
      } else if (resourceType === 'assessment' && resourceId) {
        if (type !== 'batch') throw new Error('Assessments are supported only at batch level.');
        const docRef = doc(firestore, `users/${user.uid}/${collectionName}/${chat.id}/assessments/${resourceId}`);
        await updateDoc(docRef, { published_to_gcr: true });
        const parentRef = doc(firestore, `users/${user.uid}/${collectionName}/${chat.id}`);
        if (chat.latest_quiz?.coursework_id === resourceId) {
          await updateDoc(parentRef, { 'latest_quiz.published_to_gcr': true });
        } else if (chat.latest_quiz?.id === resourceId) {
          await updateDoc(parentRef, { 'latest_quiz.published_to_gcr': true });
        }
        if (selectedAssessment && (selectedAssessment.coursework_id === resourceId || selectedAssessment.id === resourceId)) {
          selectedAssessment.published_to_gcr = true;
        }
      }

      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error('Error publishing to GCR:', error);
      toast({
        variant: 'destructive',
        title: 'Publishing Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerateDocumentation = async () => {
    if (!chat || !user) return;
    if (!subjectScopeId || !subjectScopedChat?.syllabus) {
      toast({
        title: 'Missing Subject Syllabus',
        description: 'Documentation generation requires a subject syllabus.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingDocs(true);
    try {
      const endpoint = 'http://127.0.0.1:5005/generate_documentation';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          subject_id: subjectScopeId,
          subject_slug: parentSubject?.slug || (type === 'subject' ? chat.slug : undefined),
          parent_type: 'subjects',
          user_subject_json: subjectScopedChat,
        }),
      });

      await handleApiResponse(response, endpoint);

      toast({
        title: "Documentation Generation Started",
        description: "The documentation is being generated and will appear here shortly.",
      });

    } catch (error: any) {
      console.error('Error generating documentation:', error);
      toast({
        title: 'Error Generating Documentation',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleTabClick = (tab: string) => {
    let view = tab.toLowerCase().replace(' ', '-');
    // Normalize 'Details' to 'details' or 'subject' depending on context if needed
    // But we are standardizing on 'details'
    setActiveView(view);

    const prefix = type === 'subject' ? 'subject' : 'batch';
    const id = (data as any).slug || data?.id;

    if (id) {
      router.push(`/${prefix}/${id}/${view}`);
    }
  };

  const navItems = type === 'subject'
    ? ['Details', 'Research', 'Syllabus', 'Resources', 'Question Bank', 'Documentation']
    : ['Details', 'Research', 'Syllabus', 'Students', 'Assessments', 'Documentation'];

  const linkedCourseName = useMemo(() => {
    if (type !== 'batch' || !chat?.gcr_course_id) return null;
    if (gcrCourses.length === 0) return isCourseListLoading ? "Loading..." : "Linked Course";
    return gcrCourses.find(c => c.id === chat.gcr_course_id)?.name || "Linked Course";
  }, [type, chat?.gcr_course_id, gcrCourses, isCourseListLoading]);

  // Early return for no chat must happen AFTER all hooks are declared
  if (!chat) {
    return <ChatWelcome onNewChat={onNewChat} />;
  }

  const renderAssessmentsView = () => {
    if (type !== 'batch') {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
          <p className="text-muted-foreground mb-4">Assessments are managed at batch level.</p>
          <Button variant="outline" onClick={() => router.push('/')} size="sm">Open a Batch</Button>
        </div>
      );
    }
    if (selectedAssessment) {
      return (
        <AssessmentDetails
          assessment={selectedAssessment}
          user={user}
          chat={chat}
          students={gcrStudents}
          onBack={() => setSelectedAssessment(null)}
          onPublish={(title, content, onSuccess) => handlePublishToGcr(title, content, 'assessment', selectedAssessment.id, onSuccess)}
          isPublishing={isPublishing}
          userId={user?.uid || ''}
          subjectId={chat.id}
        />
      );
    }

    if (isCreatingAssessment) {
      return (
        <div className="p-4">
          <GenerateAssessmentForm
            chat={chat}
            subjectTemplateSource={type === 'batch' ? subjects.find(s => s.id === (chat as Batch).subject_id) : undefined}
            onFinished={() => {
              setIsCreatingAssessment(false);
              // Trigger a re-fetch of assessments if needed, or just let Firestore handle it if real-time
            }}
          />
        </div>
      );
    }

    if (isAssessmentsLoading) {
      return <div className="p-4 text-center">Loading assessments...</div>;
    }

    if (assessments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
          <p className="text-muted-foreground mb-4">No assessments created yet for this subject.</p>
          <Button size="lg" onClick={() => setIsCreatingAssessment(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Your First Assessment
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Assessment History</h2>
          <Button onClick={() => setIsCreatingAssessment(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assessments.map(assessment => (
            <Card key={assessment.id || assessment.coursework_id} className="cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:bg-muted/50 border-border/50" onClick={() => setSelectedAssessment(assessment)}>
              <CardHeader className="py-4 px-6">
                <CardTitle className="text-sm font-semibold truncate">{assessment.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-1">{assessment.description || "No description"}</CardDescription>
              </CardHeader>
              <CardFooter className="py-2 px-6 flex justify-between items-center bg-muted/30">
                <span className="text-[10px] text-muted-foreground">
                  Max Points: {assessment.max_points || 'N/A'}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-[10px]">View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionBankView = () => {
    if (!subjectScopeId || !subjectScopedChat?.syllabus) {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-20 text-center px-4">
          <p className="text-muted-foreground mb-4">Question bank requires a subject syllabus.</p>
          <p className="text-xs text-muted-foreground">Create a new subject with syllabus PDF to generate question banks.</p>
        </div>
      );
    }

    if (selectedQuestionBank) {
      if (!selectedQuestionBank.content) {
        return (
          <div className="flex flex-col items-center justify-center h-full pt-20 text-center px-4">
            <p className="text-muted-foreground mb-4">Selected question bank is empty or invalid.</p>
            <Button variant="outline" onClick={() => setSelectedQuestionBank(null)}>Back to History</Button>
          </div>
        );
      }
      return (
        <div className="space-y-4 p-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedQuestionBank(null)} className="h-8 px-2 hover:bg-muted/50">
            <Download className="mr-2 h-4 w-4 rotate-180" />
            Back to List
          </Button>
          <div className="p-0">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold mb-1">{selectedQuestionBank.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedQuestionBank.description || 'No description provided.'}</p>
              </div>
              <Badge variant="secondary">{selectedQuestionBank.difficulty}</Badge>
            </div>
            <QuestionBankDisplay
              questionBank={{
                ...selectedQuestionBank.content,
                published_to_gcr: selectedQuestionBank.published_to_gcr,
                answer_key_published_to_gcr: selectedQuestionBank.answer_key_published_to_gcr
              }}
              onPublish={(title, content, onSuccess) => handlePublishToGcr(title, content, 'question_bank', selectedQuestionBank.id, onSuccess)}
              isPublishing={isPublishing}
            />
          </div>
        </div>
      );
    }

    if (isCreatingQuestionBank) {
      return (
        <div className="p-4">
          <GenerateQuestionBankForm
            chat={subjectScopedChat}
            onGenerated={() => setIsCreatingQuestionBank(false)}
            onCancel={() => setIsCreatingQuestionBank(false)}
          />
        </div>
      );
    }

    if (isQuestionBanksLoading) {
      return <div className="p-4 text-center">Loading question banks...</div>;
    }

    if (questionBanks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-20 text-center px-4">
          <p className="text-muted-foreground mb-4">No question banks generated yet.</p>
          <Button onClick={() => setIsCreatingQuestionBank(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Generate Your First Question Bank
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Question Bank History</h2>
          <Button onClick={() => setIsCreatingQuestionBank(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Generate New
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {questionBanks.map((qb) => (
            <Card key={qb.id} className="cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:bg-muted/50 border-border/50" onClick={() => setSelectedQuestionBank(qb)}>
              <CardHeader className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-1">{qb.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1">{qb.description || 'No description'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="py-2 px-6 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">{qb.difficulty}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {qb.created_at?.toDate ? qb.created_at.toDate().toLocaleDateString() : 'Just now'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px]">View</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between w-full h-14 px-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-4">
            {navItems.map((item) => {
              const view = item.toLowerCase().replace(' ', '-');
              const isActive = activeView === view || (item === 'Details' && (activeView === 'details' || activeView === 'subject'));

              return (
                <Button
                  key={item}
                  variant="ghost"
                  onClick={() => handleTabClick(item)}
                  className={cn(
                    "text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent transition-all rounded-none",
                    isActive && "text-foreground border-primary font-semibold"
                  )}
                >
                  {item}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {type === 'batch' && (linkedCourseName ? (
            <span className="text-sm text-muted-foreground">Linked to: <strong>{linkedCourseName}</strong></span>
          ) : (
            <DropdownMenu onOpenChange={(open) => open && gcrCourses.length === 0 && fetchCourses()}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Link Course
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {isCourseListLoading ? (
                  <DropdownMenuItem disabled>Loading courses...</DropdownMenuItem>
                ) : gcrCourses.length > 0 ? (
                  gcrCourses.map(course => (
                    <DropdownMenuItem key={course.id} onClick={() => handleLinkCourse(course.id)}>
                      {course.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem onClick={handleGcrAuth}>Connect to Classroom</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden h-full">
        <div className={cn(
          "w-full h-full mx-auto flex flex-col transition-all duration-300 px-2 sm:px-4 md:px-6 lg:px-8",
          activeView === 'research' ? "max-w-3xl" : activeView === 'subject' ? "max-w-5xl" : "max-w-[1600px]"
        )}>
          {activeView === 'details' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {type === 'subject' ? (
                <SubjectDetails
                  subject={data as Subject}
                  batches={batches}
                  onNewBatch={onNewBatch || (() => { })}
                  onSelectBatch={onSelectBatch || (() => { })}
                />
              ) : (
                <BatchDetails
                  batch={data as Batch}
                  subject={subjects.find(s => s.id === (data as Batch).subject_id)}
                  onSelectTab={(tab: string) => handleTabClick(tab)}
                />
              )}
            </div>
          )}

          {activeView === 'research' && (
            <div className="flex flex-col flex-1 min-h-0">
              <>
                <ChatMessages messages={messages} isLoading={isLoading} className="flex-1 overflow-y-auto" />
                <div className="p-4 pt-0 shrink-0">
                  <ChatInput
                    onSend={handleSend}
                    onResourceUpload={handleResourceUpload}
                    isLoading={isLoading}
                  />
                </div>
              </>
            </div>
          )}

          {(activeView === 'documentation' || activeView === 'syllabus' || activeView === 'question-bank' || activeView === 'assessments' || activeView === 'students' || activeView === 'resources') && (
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="p-4 h-full">
                {activeView === 'documentation' && (
                  subjectScopedChat.documentation ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{subjectScopedChat.documentation.course_title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DocumentationDisplay
                          documentation={subjectScopedChat.documentation}
                          onPublish={(title, content, onSuccess) => handlePublishToGcr(title, content, 'documentation', undefined, onSuccess)}
                          isPublishing={isPublishing}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
                      <p className="text-muted-foreground mb-4">No documentation available for this subject.</p>
                      <Button onClick={handleGenerateDocumentation} disabled={isGeneratingDocs}>
                        {isGeneratingDocs ? 'Generating...' : 'Generate Documentation'}
                      </Button>
                    </div>
                  )
                )}

                {activeView === 'syllabus' && (
                  ((type === 'subject' ? chat.syllabus : subjects.find(s => s.id === (data as Batch).subject_id)?.syllabus)) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>{(type === 'subject' ? chat.syllabus?.course_title : subjects.find(s => s.id === (data as Batch).subject_id)?.syllabus?.course_title)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const parentSubject = type === 'subject' ? chat : subjects.find(s => s.id === (data as Batch).subject_id);
                          const displaySyllabus = parentSubject?.syllabus;
                          if (!parentSubject || !displaySyllabus) return null;
                          return (
                        <SyllabusDisplay
                          syllabus={displaySyllabus as any}
                          subjectId={parentSubject.id}
                          progressOwnerType={type === 'subject' ? 'subjects' : 'batches'}
                          progressOwnerId={chat.id}
                          completedSubtopics={chat.completed_subtopics}
                          subject={parentSubject as any}
                        />
                          );
                        })()}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-full pt-20">
                      <p className="text-muted-foreground">No syllabus available for this subject.</p>
                    </div>
                  )
                )}

                {activeView === 'question-bank' && renderQuestionBankView()}

                {activeView === 'assessments' && renderAssessmentsView()}

                {activeView === 'students' && (
                  <StudentsDisplay
                    gcrCourseId={chat.gcr_course_id}
                    students={gcrStudents}
                    isLoading={areStudentsLoading}
                    onAuth={handleGcrAuth}
                  />
                )}

                {activeView === 'resources' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PlusCircle className="h-5 w-5 text-primary" />
                          Upload New Resource
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChatInput
                          onSend={handleSend}
                          onResourceUpload={handleResourceUpload}
                          isLoading={isLoading}
                        />
                      </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(chat.resources || (type === 'batch' && subjects.find(s => s.id === (data as Batch).subject_id)?.resources))?.map((res: any, i: number) => (
                        <Card key={i} className="hover:bg-muted/50 transition-colors">
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm truncate">{typeof res === 'string' ? res : res.name}</CardTitle>
                            <CardDescription className="text-[10px]">{typeof res === 'string' ? 'Link/PDF' : res.type}</CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
