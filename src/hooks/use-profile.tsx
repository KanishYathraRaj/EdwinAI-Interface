'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Profile, DailyAvailability } from '@/types/database';

export function useProfile() {
    const { user } = useUser();
    const firestore = useFirestore();

    const profileRef = useMemo(() => {
        if (!user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: profile, isLoading, error } = useDoc<Profile>(profileRef);

    const updateAvailability = async (availability: DailyAvailability[]) => {
        if (!user) return;
        const ref = doc(firestore, `users/${user.uid}`);
        await updateDoc(ref, {
            availability,
            updated_at: new Date().toISOString()
        });
    };

    return {
        profile,
        isLoading,
        error,
        updateAvailability
    };
}
