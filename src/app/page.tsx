'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ChatWelcome } from '@/components/chat/ChatWelcome';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, orderBy, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleApiResponse, slugify } from '@/lib/utils';
import { GlobalWeeklyCalendar } from '@/components/dashboard/GlobalWeeklyCalendar';
import type { Subject, Batch } from '@/types/database';

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

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);

  const batchesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/batches`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: batches, isLoading: isBatchesLoading } = useCollection<Batch>(batchesQuery);
  const isLoading = areSubjectsLoading || isBatchesLoading;

  // REMOVED: Auto-redirect to first subject

  const addChat = async (title: string, file: File) => {
    if (!user) return;
    try {
      const subjectSlug = slugify(title || 'New Subject');
      const docRef = await addDoc(collection(firestore, `users/${user.uid}/subjects`), {
        user_id: user.uid,
        subject_name: title || 'New Subject',
        slug: subjectSlug,
        syllabus_status: 'processing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        conversation_history: [],
        resources: [],
      });
      const subjectId = docRef.id;
      try {
        const formData = new FormData();
        formData.append('user_id', user.uid);
        formData.append('subject_id', subjectId);
        if (subjectSlug) formData.append('subject_slug', subjectSlug);
        formData.append('file', file);
        const endpoint = 'http://127.0.0.1:5005/upsert_syllabus';
        const response = await fetch(endpoint, { method: 'POST', body: formData });
        await handleApiResponse(response, endpoint);
        await updateDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId), {
          syllabus_status: 'ready',
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Syllabus Uploaded", description: "The syllabus has been processed." });
        router.push(`/subject/${subjectSlug || subjectId}/details`);
      } catch (e) {
        await deleteDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId));
        throw e;
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
      <main className="h-screen bg-background text-foreground">
        <SidebarProvider>
          <Sidebar collapsible="icon" className="bg-sidebar">
            <ChatSidebar
              subjects={subjects || []}
              batches={batches || []}
              activeId={null}
              activeType="home"
              onNewSubject={addChat}
              onNewBatch={(subjectId) => {
                console.log('New batch for subject:', subjectId);
                toast({ title: "Coming Soon", description: "Batch creation will be available in the subject details view." });
              }}
              onSelectSubject={(id) => {
                const s = subjects?.find(c => c.id === id);
                const isReady = !!s?.syllabus?.units?.length || s?.syllabus_status === 'ready';
                if (!isReady) return;
                if (s) router.push(`/subject/${s.slug || s.id}/details`);
              }}
              onSelectBatch={(id) => {
                const b = batches?.find(batch => batch.id === id);
                router.push(`/batch/${b?.slug || id}/details`);
              }}
              onDeleteSubject={() => toast({ title: "Feature coming soon", description: "Subject management is currently only available from the Subject view." })}
              onDeleteBatch={(id) => {
                const b = batches?.find(batch => batch.id === id);
                if (b) toast({ title: "Coming Soon", description: `Batch deletion for "${b.batch_name}" will be available in the batch details view.` });
              }}
              onRenameSubject={() => toast({ title: "Feature coming soon", description: "Subject management is currently only available from the Subject view." })}
              onSelectHome={() => router.push('/')}
              isLoading={isLoading}
            />
          </Sidebar>
          <SidebarInset className="bg-background overflow-hidden h-screen">
            <GlobalWeeklyCalendar subjects={subjects || []} batches={batches || []} />
          </SidebarInset>
        </SidebarProvider>
      </main>
    </AuthGuard>
  );
}
