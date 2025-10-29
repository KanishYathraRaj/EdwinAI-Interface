import { cn } from "@/lib/utils"
import type { Message } from "@/lib/types"
import { Bot, User } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { BeatLoader } from 'react-spinners'; // A simple spinner

function ChatAvatar({ role }: { role: Message['role'] }) {
    return (
        <Avatar className="size-8">
            <div className={cn("flex size-full items-center justify-center rounded-full", role === 'user' ? 'bg-primary/10 text-primary' : 'bg-secondary')}>
                {role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
        </Avatar>
    )
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const { role, content } = message
  return (
    <div className={cn("flex items-start gap-3 animate-in fade-in duration-500", role === 'user' && 'justify-end')}>
        {role !== 'user' && <ChatAvatar role={role} />}
        <div className={cn(
            "max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap",
            role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border",
        )}>
            {isLoading && role === 'assistant' ? (
                <div className="flex items-center justify-center p-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                </div>
            ) : (
                content
            )}
        </div>
        {role === 'user' && <ChatAvatar role={role} />}
    </div>
  )
}
