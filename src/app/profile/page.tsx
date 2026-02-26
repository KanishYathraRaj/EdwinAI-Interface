'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import type { Subject } from '@/lib/types';
import { AuthGuard } from '@/components/auth/auth-guard';

function ProfileContent() {
  const { user } = useUser();
  const firestore = useFirestore();

  // user is guaranteed non-null here (AuthGuard handles the redirect)
  const userId = user!.uid;

  const userDocRef = useMemoFirebase(() => {
    return doc(firestore, `users/${userId}`);
  }, [firestore, userId]);

  const subjectsQuery = useMemoFirebase(() => {
    return query(collection(firestore, `users/${userId}/subjects`));
  }, [firestore, userId]);

  const { data: userData, isLoading: isDataLoading, error: userDocError } = useDoc(userDocRef);
  const { data: subjects, isLoading: areSubjectsLoading, error: subjectsError } = useCollection<Subject>(subjectsQuery);

  const error = userDocError || subjectsError;

  if (isDataLoading || areSubjectsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="ml-4 text-foreground">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-background p-4 text-destructive">
        <h1 className="text-2xl font-semibold mb-4">An Error Occurred</h1>
        <p>Failed to fetch user data. This might be a permissions issue.</p>
        <pre className="mt-4 p-4 bg-card rounded-md text-sm w-full max-w-2xl overflow-auto">
          <code>{error.message}</code>
        </pre>
      </main>
    );
  }

  if (!userData) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-semibold">User Not Found</h1>
        <p className="text-muted-foreground">No document found for your account.</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-4xl py-8">
        <h1 className="text-2xl font-semibold mb-4 text-foreground">User Document: {userId}</h1>
        <div className="p-4 bg-card rounded-lg border border-border text-card-foreground mb-6">
          <h2 className="text-lg font-medium mb-2">Document Data</h2>
          <pre className="text-sm bg-background p-4 rounded-md overflow-x-auto">
            <code>{JSON.stringify(userData, null, 2)}</code>
          </pre>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-foreground">Subcollection: subjects</h2>
        {subjects && subjects.length > 0 ? (
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.id} className="p-4 bg-card rounded-lg border border-border text-card-foreground">
                <h3 className="text-lg font-medium mb-2">Subject ID: {subject.id}</h3>
                <pre className="text-sm bg-background p-4 rounded-md overflow-x-auto">
                  <code>{JSON.stringify(subject, null, 2)}</code>
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-card rounded-lg border border-border text-card-foreground">
            <p className="text-muted-foreground">No documents found in the 'subjects' subcollection.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
