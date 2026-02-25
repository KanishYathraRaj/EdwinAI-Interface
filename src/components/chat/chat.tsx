'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Chat, Message, GcrCourse, Assessment, GcrCourseWork, StudentSubmission, GcrStudent, QuestionBankHistory } from '@/lib/types';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChatWelcome } from './chat-welcome';
import { useUser, useFirestore } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { doc, updateDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '../ui/button';
import SyllabusDisplay from './syllabus-display';
import QuestionBankDisplay from './question-bank-display';
import GenerateQuestionBankForm from './generate-question-bank-form';
import DocumentationDisplay from './documentation-display';
import { cn, handleApiResponse, GcrAuthError } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Download, Upload, Link as LinkIcon, ExternalLink, PlusCircle, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { uploadMaterialToGcr, generateGcrAssessment, getGcrCoursework, triggerGcrAuth, publishToGcr } from '@/lib/gcr';
import { useGcr } from '@/contexts/gcr-context';
import StudentsDisplay from './students-display';
import GenerateAssessmentForm from './generate-assessment-form';
import AssessmentDetails from './assessment-details';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
  initialView?: string;
}

export default function ChatComponent({ chat, onNewChat, initialView = 'research' }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState(initialView);

  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [isCreatingQuestionBank, setIsCreatingQuestionBank] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);

  const [questionBanks, setQuestionBanks] = useState<QuestionBankHistory[]>([]);
  const [isQuestionBanksLoading, setIsQuestionBanksLoading] = useState(false);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState<QuestionBankHistory | null>(null);

  const {
    courses: gcrCourses,
    studentsCache,
    isLoadingCourses: isCourseListLoading,
    loadingStudents,
    fetchCourses,
    fetchStudents,
    isGcrAuthDone,
    setGcrAuthDone,
  } = useGcr();

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
      if (assessments.length === 0 || assessments[0]?.subjectId !== chat.id) { // Simple check for subject change or empty
        setIsAssessmentsLoading(true);
        try {
          const assessmentsRef = collection(firestore, `users/${user.uid}/subjects/${chat.id}/assessments`);
          const q = query(assessmentsRef, orderBy("created_at", "desc"));
          const querySnapshot = await getDocs(q);
          const history: Assessment[] = [];
          querySnapshot.forEach((doc) => {
            history.push({ id: doc.id, ...doc.data(), subjectId: chat.id } as any);
          });
          setAssessments(history.length > 0 ? history : (chat.latest_quiz ? [chat.latest_quiz] : []));
        } catch (e) { console.error("Error fetching assessments:", e); }
        finally { setIsAssessmentsLoading(false); }
      }

      // 2. Fetch Question Banks
      if (questionBanks.length === 0 || (questionBanks[0] as any).subjectId !== chat.id) {
        setIsQuestionBanksLoading(true);
        try {
          const qbRef = collection(firestore, `users/${user.uid}/subjects/${chat.id}/question_banks`);
          const q = query(qbRef, orderBy("created_at", "desc"));
          const querySnapshot = await getDocs(q);
          const history: QuestionBankHistory[] = [];
          querySnapshot.forEach((doc) => {
            history.push({ id: doc.id, ...doc.data(), subjectId: chat.id } as any);
          });
          setQuestionBanks(history.length > 0 ? history : (chat.latest_question_bank ? [chat.latest_question_bank] : []));
        } catch (e) { console.error("Error fetching question banks:", e); }
        finally { setIsQuestionBanksLoading(false); }
      }

      // 3. Fetch Students if GCR is linked
      if (chat.gcr_course_id && gcrStudents.length === 0 && !areStudentsLoading) {
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
  }, [chat?.id, user, chat?.gcr_course_id, gcrStudents.length, areStudentsLoading, fetchStudents]);


  const handleGcrAuth = async () => {
    try {
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
    if (gcrCourses.length === 0 && !isCourseListLoading && user) {
      fetchCourses();
    }
  }, [user, gcrCourses.length, isCourseListLoading, fetchCourses]);

  const handleLinkCourse = async (courseId: string) => {
    if (!chat || !user) return;
    const subjectRef = doc(firestore, 'users', user.uid, 'subjects', chat.id);
    await updateDoc(subjectRef, {
      gcr_course_id: courseId
    });
    toast({
      title: "Course Linked",
      description: "This subject is now linked to your Google Classroom course.",
    });
  };

  const handleUploadToGcr = async (materialType: 'documentation' | 'question_bank') => {
    if (!chat || !chat.gcr_course_id) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Please link a Google Classroom course to this subject first.",
      });
      return;
    }

    const material = chat[materialType];
    if (!material) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: `No ${materialType.replace('_', ' ')} available to upload.`,
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadMaterialToGcr(chat.gcr_course_id, material, materialType);
      toast({
        title: "Upload Successful",
        description: `The ${materialType.replace('_', ' ')} has been uploaded to Google Classroom.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || `Could not upload the ${materialType.replace('_', ' ')}.`,
      });
    } finally {
      setIsUploading(false);
    }
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

    const formData = new FormData();
    formData.append('user_id', user.uid);
    formData.append('subject_id', chat.id);
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
          subject_id: chat.id,
          user_subject_json: chat,
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
    if (!chat.gcr_course_id) {
      toast({
        variant: 'destructive',
        title: 'No Course Linked',
        description: 'Please link this subject to a Google Classroom course first.',
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishToGcr(chat.gcr_course_id, title, content);
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
      if (resourceType === 'documentation') {
        const docRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}`);
        await updateDoc(docRef, { 'documentation.published_to_gcr': true });
        chat.documentation!.published_to_gcr = true;
      } else if (resourceType === 'question_bank' && resourceId) {
        const isAnswerKey = title.startsWith('Answer Key');
        const updateField = isAnswerKey ? 'answer_key_published_to_gcr' : 'published_to_gcr';

        const docRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}/question_banks/${resourceId}`);
        await updateDoc(docRef, { [updateField]: true });

        const subjectRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}`);
        if (chat.latest_question_bank?.id === resourceId) {
          await updateDoc(subjectRef, { [`latest_question_bank.${updateField}`]: true });
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
        const docRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}/assessments/${resourceId}`);
        await updateDoc(docRef, { published_to_gcr: true });
        const subjectRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}`);
        if (chat.latest_quiz?.coursework_id === resourceId) {
          await updateDoc(subjectRef, { 'latest_quiz.published_to_gcr': true });
        } else if (chat.latest_quiz?.id === resourceId) {
          await updateDoc(subjectRef, { 'latest_quiz.published_to_gcr': true });
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
          subject_id: chat.id,
          user_subject_json: chat,
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
    const view = tab.toLowerCase().replace(' ', '-');
    setActiveView(view);
    // Note: We intentionally DON'T reset selectedAssessment/QuestionBank here
    // to allow users to "go back" to their selection if they switch tabs and come back.
    // However, if we WANT to reset them, we should do it only if fundamentally changing context.

    // Update URL - strictly use slug
    if (chat?.slug) {
      router.push(`/subject/${chat.slug}/${view}`);
    }
  };

  const navItems = ['Research', 'Documentation', 'Syllabus', 'Question Bank', 'Assessments', 'Students'];

  const linkedCourseName = useMemo(() => {
    if (!chat?.gcr_course_id) return null;
    if (gcrCourses.length === 0) return isCourseListLoading ? "Loading..." : "Linked Course";
    return gcrCourses.find(c => c.id === chat.gcr_course_id)?.name || "Linked Course";
  }, [chat?.gcr_course_id, gcrCourses, isCourseListLoading]);

  // Early return for no chat must happen AFTER all hooks are declared
  if (!chat) {
    return <ChatWelcome onNewChat={onNewChat} />;
  }

  const renderAssessmentsView = () => {
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
        />
      );
    }

    if (isCreatingAssessment) {
      return (
        <div className="p-4">
          <GenerateAssessmentForm
            chat={chat}
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
    if (selectedQuestionBank) {
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
            chat={chat}
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
            {navItems.map((item) => (
              <Button
                key={item}
                variant="ghost"
                onClick={() => handleTabClick(item.toLowerCase().replace(' ', '-'))}
                className={cn(
                  "text-sm font-medium text-muted-foreground hover:text-foreground",
                  activeView === item.toLowerCase().replace(' ', '-') && "text-foreground"
                )}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {linkedCourseName ? (
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
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden h-full">
        <div className={cn(
          "w-full h-full mx-auto flex flex-col transition-all duration-300 px-2 sm:px-4 md:px-6 lg:px-8",
          activeView === 'research' ? "max-w-3xl" : "max-w-[1600px]"
        )}>
          {activeView === 'research' && (
            <div className="flex flex-col flex-1 min-h-0">
              <ChatMessages messages={messages} isLoading={isLoading} className="flex-1 overflow-y-auto" />
              <div className="p-4 pt-0 shrink-0">
                <ChatInput
                  onSend={handleSend}
                  onResourceUpload={handleResourceUpload}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {(activeView === 'documentation' || activeView === 'syllabus' || activeView === 'question-bank' || activeView === 'assessments' || activeView === 'students') && (
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="p-4 h-full">
                {activeView === 'documentation' && (
                  chat.documentation ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{chat.documentation.course_title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DocumentationDisplay
                          documentation={chat.documentation}
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
                  chat.syllabus ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>{chat.syllabus.course_title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SyllabusDisplay
                          syllabus={chat.syllabus}
                          chatId={chat.id}
                          completedSubtopics={chat.completed_subtopics}
                        />
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
