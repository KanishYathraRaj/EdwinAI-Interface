'use client';

import { useState, useEffect } from 'react';
import type { Chat, Message } from '@/lib/types';
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
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
}

export default function ChatComponent({ chat, onNewChat }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState('research');

  useEffect(() => {
    if (chat?.conversation_history) {
      setMessages(chat.conversation_history);
    } else {
      setMessages([]);
    }
    // When chat changes, default back to research view
    setActiveView('research');
  }, [chat]);

  const handleSend = async (content: string) => {
    if (!chat || !user) return;
  
    const userMessage: Message = {
      role: 'user',
      content: content,
    };
  
    // Optimistically update the UI with the user's message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
  
    try {
      const response = await fetch('http://127.0.0.1:5000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          subject_id: chat.id,
          user_query: content,
          user_subject_json: chat,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }
  
      const responseData = await response.json();
      
      const assistantMessage: Message = {
          role: 'assistant',
          content: responseData.response,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'An error occurred',
        description: 'Failed to get a response from the AI. Please try again.',
        variant: 'destructive',
      });
      // Revert to previous messages on error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestionBank = async () => {
    if (!chat || !user) return;

    setIsGenerating(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/generate_question_bank', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }
      
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

  const handleGenerateDocumentation = async () => {
    if (!chat || !user) return;

    setIsGeneratingDocs(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/generate_documentation', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }

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
  };

  const navItems = ['Research', 'Documentation', 'Syllabus', 'Question Bank', 'Students'];

  return (
    <div className="flex flex-col h-full">
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
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-full max-w-4xl mx-auto">
            {activeView === 'research' && (
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <ChatMessages messages={messages} isLoading={isLoading} />
                    </div>
                    <div className="pb-4">
                        <ChatInput onSend={handleSend} isLoading={isLoading} />
                    </div>
                </div>
            )}

            {activeView === 'documentation' && (
                <div className="p-4">
                    {chat.documentation ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{chat.documentation.course_title}</CardTitle>
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
                        <CardHeader>
                            <CardTitle>{chat.question_bank.course_title}</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
