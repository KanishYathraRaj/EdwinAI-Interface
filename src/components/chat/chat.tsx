'use client';

import { useState } from 'react';
import type { Chat, Message } from '@/lib/types';
import { continueConversation } from '@/ai/flows/chat';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { useToast } from '@/hooks/use-toast';

interface ChatProps {
  chat: Chat | undefined;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

export default function ChatComponent({ chat, setChats }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async (content: string) => {
    if (!chat) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content };
    const updatedMessages = [...chat.messages, userMessage];
    
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: updatedMessages } : c));
    setIsLoading(true);

    try {
      const responseContent = await continueConversation({ history: updatedMessages });
      const assistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: responseContent };
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: [...updatedMessages, assistantMessage] } : c));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "An error occurred",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
      // remove the user message on error to allow retry
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: chat.messages } : c));
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Select a chat or start a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={chat.messages} isLoading={isLoading} />
      </div>
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
