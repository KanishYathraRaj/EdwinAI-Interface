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
import { useToast } from '@/hooks/use-toast';

export function ChatLayout() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

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

  const addChat = async (title: string, file: File | null) => {
    if (!user) return;
    try {
      // Step 1: Create the subject document in Firestore
      const docRef = await addDoc(collection(firestore, `users/${user.uid}/subjects`), {
        subject_name: title || 'New Subject',
        createdAt: serverTimestamp(),
        conversation_history: [],
        resources: [],
      });
      const subjectId = docRef.id;
      setActiveChatId(subjectId);

      // Step 2: If a file is provided, call the Flask API
      if (file) {
        const formData = new FormData();
        formData.append('user_id', user.uid);
        formData.append('subject_id', subjectId);
        formData.append('file', file);
        
        try {
          const response = await fetch('http://127.0.0.1:5000/upsert_syllabus', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API call failed');
          }
          
          toast({
            title: "Syllabus Uploaded",
            description: "The syllabus has been processed and updated.",
          });

        } catch (apiError: any) {
          console.error("Error calling Flask API: ", apiError);
          toast({
            variant: "destructive",
            title: "Syllabus Upload Failed",
            description: apiError.message || "Could not connect to the processing service.",
          });
        }
      }
    } catch (error) {
      console.error("Error creating new subject: ", error);
       toast({
        variant: "destructive",
        title: "Error Creating Subject",
        description: "An error occurred while creating the new subject.",
      });
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
    if (activeChat && (activeChat as Chat).messages && (activeChat as Chat).messages.length > 1 && activeChat.subject_name === 'New Subject') {
      const history = (activeChat as Chat).messages.map(m => `${m.role}: ${m.content}`).join('\n');
      summarizeChatHistory({ chatHistory: history })
        .then(summary => {
          if (user && activeChat.id) {
            const chatDocRef = doc(firestore, `users/${user.uid}/subjects`, activeChat.id);
            updateDoc(chatDocRef, { subject_name: summary.summary });
          }
        })
        .catch(console.error);
    }
  }, [activeChat, firestore, user]);

  const sortedChats = useMemo(() => {
    if (!subjects) return [];
    // The query is already sorting by createdAt descending
    return subjects;
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
            onNewChat={() => addChat('New Subject', null)}
          />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
