import { GraduationCap, User } from 'lucide-react';
import { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-4 p-6 ${isAssistant ? 'bg-zinc-900/50' : ''}`}>
      <div className="flex-shrink-0">
        {isAssistant ? (
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-md bg-zinc-700 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-semibold text-white">
          {isAssistant ? 'EdwinAI' : 'You'}
        </p>
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}
