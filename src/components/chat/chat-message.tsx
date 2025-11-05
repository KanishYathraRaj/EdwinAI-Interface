import { cn } from "@/lib/utils"
import type { Message } from "@/lib/types"
import { Bot, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function ChatAvatar({ role }: { role: Message['role'] }) {
    return (
        <Avatar className="size-8">
            {role === 'user' ? (
                <AvatarImage src="https://picsum.photos/seed/user-avatar/32/32" data-ai-hint="profile picture" />
            ) : (
                <AvatarImage src="/openai.svg" />
            )}
            <AvatarFallback>
                {role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </AvatarFallback>
        </Avatar>
    )
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const { role, message: content } = message
  return (
    <div className={cn(
        "flex items-start gap-4 animate-in fade-in duration-500",
        role === 'user' && 'justify-end'
    )}>
        {role !== 'user' && <ChatAvatar role={role} />}
        <div className={cn(
            "max-w-[85%] rounded-lg p-0.5 text-sm whitespace-pre-wrap flex-1",
            role === 'user' ? 'bg-primary/10 p-3 rounded-xl' : ''
        )}>
            <p className={cn("font-bold mb-1", role === 'user' && "hidden")}>{role === 'user' ? 'You' : 'EdwinAI'}</p>
            {isLoading && role === 'assistant' ? (
                <div className="flex items-center justify-start p-1 gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                </div>
            ) : (
                <div className="prose prose-invert prose-p:my-0">{content}</div>
            )}
        </div>
        {role === 'user' && <ChatAvatar role={role} />}
    </div>
  )
}
