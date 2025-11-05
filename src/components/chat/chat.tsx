'use client';

import { useState, useEffect } from 'react';
import type { Chat, Message } from '@/lib/types';
import { continueConversation } from '@/ai/flows/chat';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChevronDown } from 'lucide-react';
import { ChatWelcome } from './chat-welcome';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

interface ChatProps {
  chat: Chat | undefined;
  onNewChat: () => void;
}

export default function ChatComponent({ chat, onNewChat }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const messagesQuery = useMemoFirebase(() => {
    if (!user || !chat?.id) return null;
    return query(
      collection(firestore, `users/${user.uid}/subjects/${chat.id}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, user, chat?.id]);

  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);

  const handleSend = async (content: string) => {
    if (!chat || !user) return;

    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content,
      timestamp: serverTimestamp(),
    };
    
    setIsLoading(true);

    try {
      const messagesCol = collection(firestore, `users/${user.uid}/subjects/${chat.id}/messages`);
      await addDoc(messagesCol, userMessage);
      
      const currentMessages = messages || [];
      
      const responseContent = await continueConversation({
        history: [...currentMessages, { ...userMessage, id: 'temp-id' }].map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      });

      const assistantMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: responseContent,
        timestamp: serverTimestamp(),
      };
      await addDoc(messagesCol, assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "An error occurred",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
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
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-1">EdwinAI <ChevronDown size={16}/></h1>
            </div>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto w-full max-w-4xl">
        <ChatMessages messages={messages || []} isLoading={isLoading || messagesLoading} />
      </div>
      <div className="w-full max-w-4xl pb-4">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
