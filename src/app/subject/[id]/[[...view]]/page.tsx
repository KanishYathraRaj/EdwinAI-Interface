'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useMemoFirebase, useDoc, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { Subject, Chat } from '@/lib/types';
import ChatComponent from '@/components/chat/chat';

export default function SubjectPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;
    const viewArray = params.view as string[] | undefined;
    const activeView = viewArray ? viewArray[0] : 'research';

    const subjectsQuery = useMemoFirebase(() => {
        if (!user || !id) return null;
        return query(
            collection(firestore, `users/${user.uid}/subjects`),
            where('slug', '==', id),
            limit(1)
        );
    }, [firestore, user, id]);

    const { data: subjectsBySlug, isLoading } = useCollection<Subject>(subjectsQuery);
    const subject = subjectsBySlug?.[0];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <h2 className="text-xl font-bold mb-2">Subject not found</h2>
                <p className="text-muted-foreground mb-4">The subject you are looking for does not exist or has been deleted.</p>
                <button
                    onClick={() => router.push('/')}
                    className="text-primary hover:underline"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return null;
}
