'use client';

import { useRef, useEffect, type KeyboardEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChatInputProps {
  onSend: (content: string, isGrounded: boolean) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isGrounded, setIsGrounded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content || !content.trim() || isLoading) return;
    onSend(content.trim(), isGrounded);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message EdwinAI..."
          className="resize-none pr-12 py-3 max-h-48 rounded-2xl border-sidebar-border focus-visible:ring-0 focus-visible:border-sidebar-border/50 transition-all"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          size="icon"
          className="shrink-0 absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg bg-white hover:bg-white/90 text-black disabled:bg-white"
          disabled={isLoading || !content?.trim()}
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-center text-xs text-muted-foreground/50">EdwinAI can make mistakes. Consider checking important information.</p>
        <div className="flex items-center space-x-2">
          <Switch id="grounded-mode" checked={isGrounded} onCheckedChange={setIsGrounded} />
          <Label htmlFor="grounded-mode" className="text-xs text-muted-foreground">
            {isGrounded ? 'Grounded' : 'Explore'}
          </Label>
        </div>
      </div>
    </div>
  );
}
