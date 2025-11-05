'use client';

import { useState, useEffect, useMemo } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Chat, ChatSession } from '@/lib/types';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatComponent from '@/components/chat/chat';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';

export function ChatLayout() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const chatSessionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/chatSessions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: chats, isLoading: areChatsLoading } = useCollection<ChatSession>(chatSessionsQuery);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (!activeChatId && chats && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  const addChat = async (title: string) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(firestore, `users/${user.uid}/chatSessions`), {
        title: title || 'New Subject',
        createdAt: serverTimestamp(),
      });
      setActiveChatId(docRef.id);
    } catch (error) {
      console.error("Error creating new chat session: ", error);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    const chatDocRef = doc(firestore, `users/${user.uid}/chatSessions`, chatId);
    await deleteDoc(chatDocRef);

    if (activeChatId === chatId) {
      const remainingChats = chats?.filter(c => c.id !== chatId);
      if (remainingChats && remainingChats.length > 0) {
        const deletedIndex = chats?.findIndex(c => c.id === chatId) ?? 0;
        const newActiveIndex = Math.max(0, deletedIndex - 1);
        setActiveChatId(remainingChats[newActiveIndex]?.id || null);
      } else {
        setActiveChatId(null);
      }
    }
  };

  const activeChat = useMemo(() => chats?.find(chat => chat.id === activeChatId), [chats, activeChatId]);

  useEffect(() => {
    if (activeChat && activeChat.messages && activeChat.messages.length > 1 && activeChat.title === 'New Subject') {
      const history = activeChat.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      summarizeChatHistory({ chatHistory: history })
        .then(summary => {
          if (user && activeChat.id) {
            const chatDocRef = doc(firestore, `users/${user.uid}/chatSessions`, activeChat.id);
            updateDoc(chatDocRef, { title: summary.summary });
          }
        })
        .catch(console.error);
    }
  }, [activeChat, firestore, user]);

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [chats]);

  return (
    <div className="h-full w-full">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="bg-sidebar">
          <ChatSidebar 
            chats={sortedChats}
            activeChatId={activeChatId}
            onNewSubject={addChat}
            onSelectChat={setActiveChatId}
            onDeleteChat={deleteChat}
            isLoading={areChatsLoading || isUserLoading}
          />
        </Sidebar>
        <SidebarInset className="bg-background">
          <ChatComponent
            key={activeChatId}
            chat={activeChat as Chat | undefined}
            onNewChat={() => addChat('New Subject')}
          />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
