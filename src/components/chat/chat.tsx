'use client';

import { useState, useEffect } from 'react';
import type { Chat, Message } from '@/lib/types';
import { continueConversation } from '@/ai/flows/chat';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChatWelcome } from './chat-welcome';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../ui/button';
import SyllabusDisplay from './syllabus-display';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
}

export default function ChatComponent({ chat, onNewChat }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
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
      id: `user-${Date.now()}`,
      role: 'user',
      message: content,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const responseContent = await continueConversation({
        history: updatedHistory.map(m => ({
          role: m.role,
          message: m.message
        }))
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        message: responseContent,
      };

      const finalHistory = [...updatedHistory, assistantMessage];
      setMessages(finalHistory);

      const subjectDocRef = doc(firestore, `users/${user.uid}/subjects/${chat.id}`);
      await updateDoc(subjectDocRef, {
        conversation_history: finalHistory
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "An error occurred",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
      // Revert to previous history on error
      setMessages(messages);
    } finally {
      setIsLoading(false);
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
    <div className="flex flex-col h-full items-center">
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

      {activeView === 'research' && (
        <>
          <div className="flex-1 overflow-y-auto w-full max-w-4xl">
            <ChatMessages messages={messages} isLoading={isLoading} />
          </div>
          <div className="w-full max-w-4xl pb-4">
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </div>
        </>
      )}

      {activeView === 'syllabus' && chat.syllabus && (
        <div className="flex-1 overflow-y-auto w-full max-w-4xl p-4">
            <Card>
                <CardHeader>
                    <CardTitle>{chat.syllabus.course_title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <SyllabusDisplay syllabus={chat.syllabus} />
                </CardContent>
            </Card>
        </div>
      )}
      
      {activeView === 'syllabus' && !chat.syllabus && (
          <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">No syllabus available for this subject.</p>
          </div>
      )}

    </div>
  );
}
