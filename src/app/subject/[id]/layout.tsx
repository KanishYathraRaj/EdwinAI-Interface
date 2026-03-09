'use client';

import { useMemo, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Subject, Batch, DailyAvailability } from '@/types/database';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleApiResponse, slugify } from '@/lib/utils';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import ChatComponent from '@/components/chat/chat';
import { NewBatchDialog } from '@/components/chat/NewBatchDialog';
import { useState } from 'react';

export default function SubjectLayout({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const [newBatchSubjectId, setNewBatchSubjectId] = useState<string | null>(null);

    const activeChatId = params.id as string;

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
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                });

                await handleApiResponse(response, endpoint);
                await updateDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId), {
                    syllabus_status: 'ready',
                    updatedAt: serverTimestamp(),
                });

                toast({
                    title: "Syllabus Uploaded",
                    description: "The syllabus has been processed and updated.",
                });
                router.push(`/subject/${subjectSlug || subjectId}/details`);

            } catch (apiError: any) {
                await deleteDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId));
                console.error("Error calling Flask API: ", apiError);
                toast({
                    variant: "destructive",
                    title: "Syllabus Upload Failed",
                    description: apiError.message || "Could not connect to the processing service.",
                });
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
                const nextChat = remainingChats[newActiveIndex];
                router.push(`/subject/${nextChat.slug || nextChat.id}/details`);
            } else {
                router.push('/');
            }
        }
    };

    const renameSubject = async (chatId: string, newTitle: string) => {
        if (!user) return;
        const chatDocRef = doc(firestore, `users/${user.uid}/subjects`, chatId);
        const newSlug = slugify(newTitle);
        await updateDoc(chatDocRef, {
            subject_name: newTitle,
            slug: newSlug
        });
        toast({
            title: "Subject Renamed",
            description: "The subject name and URL have been updated.",
        });
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

            // Generate scheduled topics using SequentialScheduler
            const { SequentialScheduler } = await import('@/lib/scheduling');
            const scheduler = new SequentialScheduler();
            const availability: DailyAvailability[] = [];
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
        if (pathname.includes(`/batch/${batchId}`)) router.push('/');
    };

    const activeChat = useMemo(() => {
        if (!subjects) return undefined;
        return subjects.find(chat => chat.slug === activeChatId || chat.id === activeChatId);
    }, [subjects, activeChatId]);

    // Handle chat summary/renaming for "New Subject"
    useEffect(() => {
        const history = (activeChat as any)?.conversation_history;
        if (activeChat && history && history.length > 1 && activeChat.subject_name === 'New Subject') {
            const historyText = history.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n');
            summarizeChatHistory({ chatHistory: historyText })
                .then(summary => {
                    if (user && activeChat.id) {
                        const chatDocRef = doc(firestore, `users/${user.uid}/subjects`, activeChat.id);
                        const summarySlug = slugify(summary.summary);
                        updateDoc(chatDocRef, {
                            subject_name: summary.summary,
                            slug: summarySlug
                        });
                    }
                })
                .catch(console.error);
        }
    }, [activeChat, firestore, user]);

    const sortedChats = useMemo(() => {
        if (!subjects) return [];
        return subjects;
    }, [subjects]);

    const handleSelectChat = (id: string) => {
        const chat = subjects?.find(c => c.id === id);
        if (!chat) return;
        const isReady = !!chat.syllabus?.units?.length || chat.syllabus_status === 'ready';
        if (!isReady) return;
        const target = chat.slug || chat.id;
        // Keep the current view suffix if it exists
        const view = pathname.split('/').slice(3).join('/') || 'details';
        router.push(`/subject/${target}/${view}`);
    };

    const currentView = useMemo(() => {
        const parts = pathname.split('/');
        // Path is /subject/[id]/[view] or /subject/[id]
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
                        activeId={activeChatId}
                        activeType="subject"
                        onNewSubject={addChat}
                        onNewBatch={(id) => setNewBatchSubjectId(id)}
                        onSelectSubject={handleSelectChat}
                        onSelectBatch={(id) => {
                            const b = batches?.find(batch => batch.id === id);
                            router.push(`/batch/${b?.slug || id}/details`);
                        }}
                        onDeleteSubject={deleteChat}
                        onDeleteBatch={deleteBatch}
                        onRenameSubject={renameSubject}
                        onSelectHome={() => router.push('/')}
                        isLoading={isLoading}
                    />
                </Sidebar>
                <SidebarInset className="bg-sidebar overflow-hidden relative border-l border-border/20">
                    {activeChat && !activeChat.syllabus?.units?.length && activeChat.syllabus_status !== 'ready' ? (
                        <div className="flex flex-col items-center justify-center h-full w-full text-center p-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                            <h2 className="text-xl font-bold mb-2">Processing Syllabus</h2>
                            <p className="text-muted-foreground max-w-md">This subject is being parsed into topics and durations. You can open it once processing completes.</p>
                        </div>
                    ) : activeChat ? (
                        <ChatComponent
                            data={activeChat as any}
                            type="subject"
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
                            <h2 className="text-xl font-bold mb-2">Subject not found</h2>
                            <p className="text-muted-foreground mb-4">The subject you are looking for does not exist or has been deleted.</p>
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
