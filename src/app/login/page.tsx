'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { IconLogo } from '@/components/icons';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2 text-foreground">
        <IconLogo className="size-8" />
        <h1 className="text-2xl font-semibold">EdwinAI</h1>
      </div>
      <div className="w-full max-w-sm">
        <AuthForm />
      </div>
    </main>
  );
}
