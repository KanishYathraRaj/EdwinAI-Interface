import { cn } from "@/lib/utils"
import type { Message } from "@/lib/types"
import { Bot, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
    const { role, content } = message
    return (
        <div className={cn(
            "flex items-start gap-4 animate-in fade-in duration-500",
            role === 'user' && 'justify-end'
        )}>
            {role !== 'user' && <ChatAvatar role={role} />}
            <div className={cn(
                "max-w-[85%] rounded-lg p-0.5 text-sm whitespace-pre-wrap",
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
                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:mb-2 prose-headings:mt-4">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc ml-6 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-6 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="mb-0">{children}</li>,
                                code: ({ children }) => <code className="bg-muted/50 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono">{children}</code>,
                                pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg my-3 overflow-x-auto text-sm font-mono border border-border/50 shadow-sm">{children}</pre>,
                            }}
                        >
                            {content || message.message || ''}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
            {role === 'user' && <ChatAvatar role={role} />}
        </div>
    )
}
