'use client';

import { useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Chat } from '@/lib/types';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatComponent from '@/components/chat/chat';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';

export function ChatLayout() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const addChat = () => {
    const newChatId = crypto.randomUUID();
    const newChat: Chat = { id: newChatId, title: 'New Chat', createdAt: new Date(), messages: [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));

    if (activeChatId === chatId) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      if (remainingChats.length > 0) {
        const deletedIndex = chats.findIndex(c => c.id === chatId);
        const newActiveIndex = Math.max(0, deletedIndex - 1);
        setActiveChatId(remainingChats[newActiveIndex]?.id || null);
      } else {
        setActiveChatId(null);
      }
    }
  };

  const activeChat = chats.find(chat => chat.id === activeChatId);

  useEffect(() => {
    if (activeChat && activeChat.messages.length > 1 && activeChat.title === 'New Chat') {
      const history = activeChat.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      summarizeChatHistory({ chatHistory: history })
        .then(summary => {
          setChats(prev => prev.map(c => c.id === activeChatId ? {...c, title: summary.summary} : c));
        })
        .catch(console.error);
    }
  }, [activeChat, activeChatId]);


  return (
    <div className="h-full w-full">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="bg-sidebar">
          <ChatSidebar 
            chats={chats.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())}
            activeChatId={activeChatId}
            onNewChat={addChat}
            onSelectChat={setActiveChatId}
            onDeleteChat={deleteChat}
          />
        </Sidebar>
        <SidebarInset className="bg-background">
            <ChatComponent key={activeChatId} chat={activeChat} setChats={setChats} onNewChat={addChat} />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
