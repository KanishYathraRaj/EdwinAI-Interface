'use client';

import { IconLogo } from '@/components/icons';
import { Button } from '../ui/button';

interface ChatWelcomeProps {
  onNewChat?: () => void;
}

export function ChatWelcome({ onNewChat }: ChatWelcomeProps) {
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-in fade-in-50 duration-500">
        <div className="flex size-12 items-center justify-center rounded-full bg-white text-black mb-4">
            <IconLogo className="size-8" />
        </div>
        <h1 className="text-2xl font-medium mb-2">How can I help you today?</h1>
        {onNewChat && (
          <Button onClick={onNewChat} variant="secondary" className="mt-4">
            Start a new subject
          </Button>
        )}
    </div>
  );
}
