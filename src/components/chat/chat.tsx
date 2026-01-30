'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Chat, Message, GcrCourse, Assessment, GcrCourseWork, StudentSubmission, GcrStudent } from '@/lib/types';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChatWelcome } from './chat-welcome';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../ui/button';
import SyllabusDisplay from './syllabus-display';
import QuestionBankDisplay from './question-bank-display';
import DocumentationDisplay from './documentation-display';
import { cn, handleApiResponse } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Download, Upload, Link as LinkIcon, ExternalLink, PlusCircle, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getGcrCourses, uploadMaterialToGcr, generateGcrAssessment, getGcrCoursework, getGcrStudents, triggerGcrAuth } from '@/lib/gcr';
import StudentsDisplay from './students-display';
import GenerateAssessmentForm from './generate-assessment-form';
import AssessmentDetails from './assessment-details';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
}

export default function ChatComponent({ chat, onNewChat }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState('research');

  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);

  const [isGcrAuthDone, setIsGcrAuthDone] = useState(false);
  const [gcrCourses, setGcrCourses] = useState<GcrCourse[]>([]);
  const [gcrStudents, setGcrStudents] = useState<GcrStudent[]>([]);
  const [isCourseListLoading, setIsCourseListLoading] = useState(false);
  const [areStudentsLoading, setAreStudentsLoading] = useState(false);


  useEffect(() => {
    if (chat?.conversation_history) {
      setMessages(chat.conversation_history);
    } else {
      setMessages([]);
    }
    setActiveView('research');
    setSelectedAssessment(null);
    setIsCreatingAssessment(false);
  }, [chat]);
  
  useEffect(() => {
    const fetchAssessments = async () => {
      if (activeView === 'assessments' && !selectedAssessment && chat?.gcr_course_id) {
        setIsAssessmentsLoading(true);
        try {
          if (chat.latest_quiz) {
            setAssessments([chat.latest_quiz]);
          } else {
            setAssessments([]);
          }
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Failed to Fetch Assessments",
            description: error.message || "Could not fetch assessments for this course.",
          });
          setAssessments([]);
        } finally {
          setIsAssessmentsLoading(false);
        }
      }
    };
    fetchAssessments();
  }, [activeView, chat, selectedAssessment, toast]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      if (chat?.gcr_course_id) {
        setAreStudentsLoading(true);
        try {
          const studentData = await getGcrStudents(chat.gcr_course_id);
          setGcrStudents(studentData);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Failed to Fetch Students",
            description: error.message || "Could not fetch students for this course.",
          });
          setGcrStudents([]);
        } finally {
          setAreStudentsLoading(false);
        }
      } else {
        setGcrStudents([]);
      }
    };
    fetchStudents();
  }, [chat?.gcr_course_id, toast]);


  const handleGcrAuth = async () => {
    try {
      await triggerGcrAuth();
      setIsGcrAuthDone(true);
      toast({
        title: "Google Classroom Authenticated",
        description: "Check your backend console for a URL to visit to complete authentication, then try fetching courses again.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "GCR Auth Failed",
        description: error.message || "Could not authenticate with Google Classroom.",
      });
    }
  };

  const handleFetchGcrCourses = async () => {
    setIsCourseListLoading(true);
    try {
      const courses = await getGcrCourses();
      setGcrCourses(courses);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Fetch Courses",
        description: error.message || "Could not fetch Google Classroom courses.",
      });
    } finally {
      setIsCourseListLoading(false);
    }
  };
  
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
      const endpoint = '/api/ask';
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
      const endpoint = '/api/upsert_resources';
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
    try {
      const endpoint = '/api/generate_question_bank';
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
      const endpoint = '/api/download_question_bank';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chat.question_bank),
      });

      const handledResponse = await handleApiResponse(response, endpoint);
      
      const blob = await handledResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const contentDisposition = handledResponse.headers.get('Content-Disposition');
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

  const handleGenerateDocumentation = async () => {
    if (!chat || !user) return;

    setIsGeneratingDocs(true);
    try {
      const endpoint = '/api/generate_documentation';
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
  
  if (!chat) {
    return <ChatWelcome onNewChat={onNewChat} />;
  }

  const handleTabClick = (tab: string) => {
    setActiveView(tab);
    setSelectedAssessment(null);
    setIsCreatingAssessment(false);
  };

  const navItems = ['Research', 'Documentation', 'Syllabus', 'Question Bank', 'Assessments', 'Students'];

  const linkedCourseName = useMemo(() => {
    if (!chat.gcr_course_id || gcrCourses.length === 0) return null;
    return gcrCourses.find(c => c.id === chat.gcr_course_id)?.name;
  }, [chat.gcr_course_id, gcrCourses]);

  const renderAssessmentsView = () => {
    if (selectedAssessment) {
      return <AssessmentDetails assessment={selectedAssessment} user={user} chat={chat} students={gcrStudents} onBack={() => setSelectedAssessment(null)} />;
    }

    if (isCreatingAssessment) {
      return (
        <div className="p-4">
          <GenerateAssessmentForm
            chat={chat}
            onFinished={() => {
              setIsCreatingAssessment(false);
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
          <p className="text-sm text-muted-foreground mb-8">"The beautiful thing about learning is that no one can take it away from you." - B.B. King</p>
          <Button size="lg" onClick={() => setIsCreatingAssessment(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Your First Assessment
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsCreatingAssessment(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Assessment
          </Button>
        </div>
        {assessments.map(assessment => (
          <Card key={assessment.id || assessment.coursework_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAssessment(assessment)}>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <CardDescription>{assessment.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              <p>Max Points: {assessment.max_points || 'Not set'}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };


  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between w-full h-14 px-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden"/>
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
              <DropdownMenu onOpenChange={(open) => open && gcrCourses.length === 0 && handleFetchGcrCourses()}>
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
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-full max-w-4xl mx-auto">
            {activeView === 'research' && (
                <div className="flex flex-col h-full">
                    <ChatMessages messages={messages} isLoading={isLoading} className="flex-1"/>
                    <div className="pb-4">
                        <ChatInput
                          onSend={handleSend}
                          onResourceUpload={handleResourceUpload}
                          isLoading={isLoading}
                        />
                    </div>
                </div>
            )}

            {activeView === 'documentation' && (
                <div className="p-4">
                    {chat.documentation ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{chat.documentation.course_title}</CardTitle>
                                 <Button variant="outline" size="sm" onClick={() => handleUploadToGcr('documentation')} disabled={isUploading || !chat.gcr_course_id}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload to GCR'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <DocumentationDisplay documentation={chat.documentation} />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
                            <p className="text-muted-foreground mb-4">No documentation available for this subject.</p>
                             <Button onClick={handleGenerateDocumentation} disabled={isGeneratingDocs}>
                                {isGeneratingDocs ? 'Generating...' : 'Generate Documentation'}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {activeView === 'syllabus' && (
                <div className="p-4">
                {chat.syllabus ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{chat.syllabus.course_title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SyllabusDisplay syllabus={chat.syllabus} />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full pt-20">
                        <p className="text-muted-foreground">No syllabus available for this subject.</p>
                    </div>
                )}
                </div>
            )}
            
            {activeView === 'question-bank' && (
                <div className="p-4">
                {chat.question_bank ? (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{chat.question_bank.course_title}</CardTitle>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleDownloadQuestionBank} disabled={isDownloading}>
                                    <Download className="mr-2 h-4 w-4" />
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleUploadToGcr('question_bank')} disabled={isUploading || !chat.gcr_course_id}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload to GCR'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <QuestionBankDisplay questionBank={chat.question_bank} />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
                        <p className="text-muted-foreground mb-4">No question bank available for this subject.</p>
                        <Button onClick={handleGenerateQuestionBank} disabled={isGenerating}>
                            {isGenerating ? 'Generating...' : 'Generate Question Bank'}
                        </Button>
                    </div>
                )}
                </div>
            )}
            
            {activeView === 'assessments' && (
              <div className="p-4">
                {renderAssessmentsView()}
              </div>
            )}

            {activeView === 'students' && (
              <div className="p-4">
                <StudentsDisplay 
                  gcrCourseId={chat.gcr_course_id} 
                  students={gcrStudents}
                  isLoading={areStudentsLoading}
                  onAuth={handleGcrAuth}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
