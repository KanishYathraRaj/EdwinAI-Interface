'use client';

import { useState, useEffect, useMemo } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Chat, Subject } from '@/lib/types';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatComponent from '@/components/chat/chat';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';

export function ChatLayout() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const subjectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/subjects`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !isUserLoading) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!activeChatId && subjects && subjects.length > 0) {
      setActiveChatId(subjects[0].id);
    }
  }, [subjects, activeChatId]);

  const addChat = async (title: string) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(firestore, `users/${user.uid}/subjects`), {
        title: title || 'New Subject',
        createdAt: serverTimestamp(),
      });
      setActiveChatId(docRef.id);
    } catch (error) {
      console.error("Error creating new subject: ", error);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    const chatDocRef = doc(firestore, `users/${user.uid}/subjects`, chatId);
    await deleteDoc(chatDocRef);

    if (activeChatId === chatId) {
      const remainingChats = subjects?.filter(c => c.id !== chatId);
      if (remainingChats && remainingChats.length > 0) {
        const deletedIndex = subjects?.findIndex(c => c.id === chatId) ?? 0;
        const newActiveIndex = Math.max(0, deletedIndex - 1);
        setActiveChatId(remainingChats[newActiveIndex]?.id || null);
      } else {
        setActiveChatId(null);
      }
    }
  };

  const activeChat = useMemo(() => subjects?.find(chat => chat.id === activeChatId), [subjects, activeChatId]);

  useEffect(() => {
    if (activeChat && (activeChat as Chat).messages && (activeChat as Chat).messages.length > 1 && activeChat.title === 'New Subject') {
      const history = (activeChat as Chat).messages.map(m => `${m.role}: ${m.content}`).join('\n');
      summarizeChatHistory({ chatHistory: history })
        .then(summary => {
          if (user && activeChat.id) {
            const chatDocRef = doc(firestore, `users/${user.uid}/subjects`, activeChat.id);
            updateDoc(chatDocRef, { title: summary.summary });
          }
        })
        .catch(console.error);
    }
  }, [activeChat, firestore, user]);

  const sortedChats = useMemo(() => {
    if (!subjects) return [];
    return [...subjects].sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [subjects]);
  
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
            isLoading={areSubjectsLoading || isUserLoading}
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
