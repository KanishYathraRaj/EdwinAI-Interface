'use client';

import { useState, useEffect } from 'react';
import type { Chat, Message } from '@/lib/types';
import { continueConversation } from '@/ai/flows/chat';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { BookOpen } from 'lucide-react';
import { ChatWelcome } from './chat-welcome';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import SyllabusDisplay from './syllabus-display';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
}

export default function ChatComponent({ chat, onNewChat }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (chat?.conversation_history) {
      setMessages(chat.conversation_history);
    } else {
      setMessages([]);
    }
  }, [chat]);

  const handleSend = async (content: string) => {
    if (!chat || !user) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const responseContent = await continueConversation({
        history: updatedHistory.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
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

  return (
    <div className="flex flex-col h-full items-center">
      <div className="flex items-center justify-between w-full h-14 px-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden"/>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-1">{chat.subject_name}</h1>
            </div>
          </div>
          {chat.syllabus && (
            <Dialog open={isSyllabusOpen} onOpenChange={setIsSyllabusOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <BookOpen size={18} />
                  <span className="sr-only">View Syllabus</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{chat.syllabus.course_title}</DialogTitle>
                </DialogHeader>
                <SyllabusDisplay syllabus={chat.syllabus} />
              </DialogContent>
            </Dialog>
          )}
      </div>
      <div className="flex-1 overflow-y-auto w-full max-w-4xl">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>
      <div className="w-full max-w-4xl pb-4">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
