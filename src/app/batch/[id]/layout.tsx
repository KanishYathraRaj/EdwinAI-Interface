'use client';

import { useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Subject, Batch, DailyAvailability } from '@/types/database';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleApiResponse, slugify } from '@/lib/utils';
import ChatComponent from '@/components/chat/chat';
import { NewBatchDialog } from '@/components/chat/NewBatchDialog';
import { useState } from 'react';

export default function BatchLayout({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const [newBatchSubjectId, setNewBatchSubjectId] = useState<string | null>(null);

    const activeBatchId = params.id as string;

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

    const { data: batches, isLoading: areBatchesLoading } = useCollection<Batch>(batchesQuery);
    const isLoading = areSubjectsLoading || areBatchesLoading;

    const activeBatch = useMemo(() => {
        if (!batches) return undefined;
        return batches.find(b => b.slug === activeBatchId || b.id === activeBatchId);
    }, [batches, activeBatchId]);

    const addChat = async (title: string, file: File) => {
        // Implementation from SubjectLayout (Simplified for brevity or just import if possible)
        // For now, redirect to home to add subject
        router.push('/');
    };

    const addBatch = async (subjectId: string, details?: { batchName: string, startDate: string, endDate: string, gcr_course_id?: string }) => {
        if (!user) return;
        const subject = subjects?.find(s => s.id === subjectId);
        if (!subject) return;

        // Calculate next batch number for this subject
        const subjectBatches = batches?.filter(b => b.subject_id === subjectId) || [];
        const nextBatchNum = subjectBatches.length + 1;
        const defaultBatchName = `Batch ${nextBatchNum}`;

        try {
            const finalBatchName = details?.batchName || defaultBatchName;
            const batchSlug = slugify(`${subject.subject_name}-${finalBatchName}`);
            const availability: DailyAvailability[] = [];

            const { SequentialScheduler } = await import('@/lib/scheduling');
            const scheduler = new SequentialScheduler();
            const scheduledTopics = subject.syllabus ? scheduler.generate(subject.syllabus, {
                startDate: details?.startDate || '',
                endDate: details?.endDate || '',
                availability,
            }) : [];

            const docRef = await addDoc(collection(firestore, `users/${user.uid}/batches`), {
                user_id: user.uid,
                subject_id: subjectId,
                batch_name: finalBatchName,
                slug: batchSlug,
                startDate: details?.startDate || '',
                endDate: details?.endDate || '',
                availability,
                gcr_course_id: details?.gcr_course_id || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                scheduledTopics,
                completed_subtopics: [],
            });
            toast({ title: "Batch Created", description: `New batch "${finalBatchName}" created.` });
            router.push(`/batch/${batchSlug || docRef.id}/details`);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not create batch." });
        }
    };

    const deleteBatch = async (batchId: string) => {
        if (!user) return;
        await deleteDoc(doc(firestore, `users/${user.uid}/batches`, batchId));
        toast({ title: "Batch Deleted" });
        router.push('/');
    };

    const currentView = useMemo(() => {
        const parts = pathname.split('/');
        if (parts.length > 3) return parts[3];
        return 'subject';
    }, [pathname]);

    return (
        <div className="h-full w-full">
            <SidebarProvider>
                <Sidebar collapsible="icon" className="bg-sidebar">
                    <ChatSidebar
                        subjects={subjects || []}
                        batches={batches || []}
                        activeId={activeBatchId}
                        activeType="batch"
                        onNewSubject={addChat}
                        onNewBatch={(id) => setNewBatchSubjectId(id)}
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
                        onDeleteBatch={deleteBatch}
                        onRenameSubject={() => toast({ title: "Feature coming soon", description: "Subject management is currently only available from the Subject view." })}
                        onSelectHome={() => router.push('/')}
                        isLoading={isLoading}
                    />
                </Sidebar>
                <SidebarInset className="bg-sidebar overflow-hidden relative border-l border-border/20">
                    {activeBatch ? (
                        <ChatComponent
                            data={activeBatch as any}
                            type="batch"
                            subjects={subjects || []}
                            batches={batches || []}
                            initialView={currentView}
                            onNewChat={() => router.push('/')}
                            onNewBatch={(id) => setNewBatchSubjectId(id)}
                            onSelectBatch={(id) => {
                                const b = batches?.find(batch => batch.id === id);
                                router.push(`/batch/${b?.slug || id}/details`);
                            }}
                        />
                    ) : isLoading ? (
                        <div className="flex items-center justify-center h-full w-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <h2 className="text-xl font-bold mb-2">Batch not found</h2>
                            <p className="text-muted-foreground mb-4">The batch you are looking for does not exist or has been deleted.</p>
                            <button onClick={() => router.push('/')} className="text-primary hover:underline">
                                Back to Home
                            </button>
                        </div>
                    )}
                </SidebarInset>
            </SidebarProvider>

            <NewBatchDialog
                open={!!newBatchSubjectId}
                onOpenChange={(open) => !open && setNewBatchSubjectId(null)}
                defaultBatchName={`Batch ${(batches?.filter(b => b.subject_id === newBatchSubjectId).length || 0) + 1}`}
                onBatchCreate={(details) => {
                    if (newBatchSubjectId) {
                        addBatch(newBatchSubjectId, details as any);
                        setNewBatchSubjectId(null);
                    }
                }}
            />
        </div>
    );
}
