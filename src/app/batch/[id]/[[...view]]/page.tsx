'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Batch } from '@/types/database';

export default function BatchPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;
    const viewArray = params.view as string[] | undefined;
    const activeView = viewArray ? viewArray[0] : 'details';

    // Let the Layout handle the chat component rendering for batches!
    // This page acts as the structural route for /batch/[id]/[any-view] like /batch/[id]/syllabus
    return null;
}
