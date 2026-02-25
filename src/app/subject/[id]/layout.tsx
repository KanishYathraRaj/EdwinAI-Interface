'use client';

import { useMemo, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import type { Subject } from '@/lib/types';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleApiResponse, slugify } from '@/lib/utils';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import ChatComponent from '@/components/chat/chat';

export default function SubjectLayout({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();

    const activeChatId = params.id as string;

    const subjectsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/subjects`),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user]);

    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);

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
            router.push(`/subject/${subjectSlug || subjectId}`);

            if (file) {
                const formData = new FormData();
                formData.append('user_id', user.uid);
                formData.append('subject_id', subjectId);
                formData.append('file', file);

                try {
                    const endpoint = 'http://127.0.0.1:5005/upsert_syllabus';
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData,
                    });

                    await handleApiResponse(response, endpoint);

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
                const nextChat = remainingChats[newActiveIndex];
                router.push(`/subject/${nextChat.slug || nextChat.id}`);
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

    const activeChat = useMemo(() => {
        if (!subjects) return undefined;
        return subjects.find(chat => chat.slug === activeChatId);
    }, [subjects, activeChatId]);

    // Handle chat summary/renaming for "New Subject"
    useEffect(() => {
        const history = activeChat?.conversation_history;
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
        const target = chat.slug || chat.id;
        // Keep the current view suffix if it exists
        const view = pathname.split('/').slice(3).join('/');
        router.push(`/subject/${target}${view ? `/${view}` : ''}`);
    };

    const currentView = useMemo(() => {
        const parts = pathname.split('/');
        // Path is /subject/[id]/[view] or /subject/[id]
        if (parts.length > 3) return parts[3];
        return 'research';
    }, [pathname]);

    return (
        <div className="h-full w-full">
            <SidebarProvider>
                <Sidebar collapsible="icon" className="bg-sidebar">
                    <ChatSidebar
                        chats={sortedChats}
                        activeChatId={activeChatId}
                        onNewSubject={addChat}
                        onSelectChat={handleSelectChat}
                        onDeleteChat={deleteChat}
                        onRenameChat={renameSubject}
                        onSelectGeneral={() => router.push('/')}
                        isLoading={areSubjectsLoading}
                    />
                </Sidebar>
                <SidebarInset className="bg-sidebar overflow-hidden relative border-l border-border/20">
                    {activeChat ? (
                        <ChatComponent
                            chat={activeChat as any}
                            initialView={currentView}
                            onNewChat={() => router.push('/')}
                        />
                    ) : (
                        children
                    )}
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
