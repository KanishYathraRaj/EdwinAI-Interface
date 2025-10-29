'use client';

import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

type FormData = {
  content: string;
};

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const content = watch('content');

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!data.content.trim() || isLoading) return;
    onSend(data.content.trim());
    reset();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="p-4 bg-background">
      <form onSubmit={handleSubmit(onSubmit)} className="relative flex items-center gap-2">
        <Textarea
          {...register('content')}
          ref={textareaRef}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="resize-none pr-16 py-3 max-h-48"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          disabled={isLoading || !content?.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
