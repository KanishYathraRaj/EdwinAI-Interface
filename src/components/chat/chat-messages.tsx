'use client'

import type { Message } from "@/lib/types"
import { ChatWelcome } from "./chat-welcome"
import { ChatMessage } from "./chat-message"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  className?: string
}

export function ChatMessages({ messages, isLoading, className }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className={cn("w-full p-4", className)}>
      {messages.length === 0 && !isLoading ? (
        <ChatWelcome />
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <ChatMessage message={{ role: 'assistant', content: 'Thinking...' }} isLoading />
          )}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}
