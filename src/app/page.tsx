'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ChatWelcome } from '@/components/chat/chat-welcome';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleApiResponse, slugify } from '@/lib/utils';
import type { Subject } from '@/lib/types';

export default function Home() {
  const { user } = useUser();
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

  const { data: subjects, isLoading } = useCollection<Subject>(subjectsQuery);

  // Redirect to first subject if available
  useEffect(() => {
    if (!isLoading && subjects && subjects.length > 0) {
      const target = subjects[0].slug || subjects[0].id;
      router.push(`/subject/${target}`);
    }
  }, [subjects, isLoading, router]);

  const addChat = async (title: string, file: File | null) => {
    if (!user) return;
    try {
      const subjectSlug = slugify(title || 'New Subject');
      const docRef = await addDoc(collection(firestore, `users/${user.uid}/subjects`), {
        subject_name: title || 'New Subject',
        slug: subjectSlug,
        createdAt: serverTimestamp(),
        conversation_history: [],
        resources: [],
      });
      const subjectId = docRef.id;
      router.push(`/subject/${subjectSlug}`);

      if (file) {
        const formData = new FormData();
        formData.append('user_id', user.uid);
        formData.append('subject_id', subjectId);
        formData.append('file', file);
        const endpoint = 'http://127.0.0.1:5005/upsert_syllabus';
        const response = await fetch(endpoint, { method: 'POST', body: formData });
        await handleApiResponse(response, endpoint);
        toast({ title: "Syllabus Uploaded", description: "The syllabus has been processed." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not create subject." });
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <main className="h-screen bg-background">
        {subjects && subjects.length > 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground animate-pulse">Entering EdwinAI...</p>
          </div>
        ) : (
          <SidebarProvider>
            <Sidebar collapsible="icon" className="bg-sidebar">
              <ChatSidebar
                chats={[]}
                activeChatId={null}
                onNewSubject={addChat}
                onSelectChat={(id) => {
                  const chat = subjects?.find(c => c.id === id);
                  if (chat?.slug) router.push(`/subject/${chat.slug}`);
                }}
                onDeleteChat={() => { }}
                onRenameChat={() => { }}
                onSelectGeneral={() => { }}
                isLoading={false}
              />
            </Sidebar>
            <SidebarInset className="bg-background">
              <ChatWelcome onNewChat={() => addChat('New Subject', null)} />
            </SidebarInset>
          </SidebarProvider>
        )}
      </main>
    </AuthGuard>
  );
}
