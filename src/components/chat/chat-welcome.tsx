'use client';

import { useState, useEffect } from 'react';
import { suggestStartingQuestions } from '@/ai/flows/suggest-starting-questions';
import { IconLogo } from '@/components/icons';

export function ChatWelcome() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    suggestStartingQuestions({})
      .then(setSuggestions)
      .catch(err => {
        console.error("Failed to fetch starting questions:", err);
        setError("Could not load suggestions.");
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-in fade-in-50 duration-500">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <IconLogo className="size-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">How can I help you today?</h1>

        {suggestions.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-card hover:bg-secondary transition-colors cursor-pointer">
                        <p className="text-sm">{suggestion}</p>
                    </div>
                ))}
            </div>
        )}
        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}
