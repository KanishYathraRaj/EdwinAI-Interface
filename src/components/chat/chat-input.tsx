'use client';

import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp } from 'lucide-react';
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
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = parseInt(getComputedStyle(textareaRef.current).maxHeight, 10);
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [content]);

  return (
    <div className="p-4 bg-transparent">
        <div className="relative">
            <Textarea
            {...register('content')}
            ref={textareaRef}
            onKeyDown={handleKeyDown}
            placeholder="Message EdwinAI..."
            className="resize-none pr-12 py-3 max-h-48 rounded-2xl border-sidebar-border focus-visible:ring-0 focus-visible:border-sidebar-border/50 transition-all"
            rows={1}
            disabled={isLoading}
            />
            <Button
            type="submit"
            size="icon"
            className="shrink-0 absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg bg-white hover:bg-white/90 text-black disabled:bg-white"
            disabled={isLoading || !content?.trim()}
            aria-label="Send message"
            >
            <ArrowUp size={18} />
            </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground/50 mt-2">EdwinAI can make mistakes. Consider checking important information.</p>
    </div>
  );
}
