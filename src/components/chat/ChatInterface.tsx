import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message } from '../../types';
import { supabase } from '../../lib/supabase';

interface ChatInterfaceProps {
  sessionId: string | null;
  subjectId: string | null;
  userId: string;
}

export function ChatInterface({ sessionId, subjectId, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const createSession = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        subject_id: subjectId,
        title: 'New Chat',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const handleSendMessage = async (content: string) => {
    try {
      setLoading(true);

      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
      }

      const userMessage: Omit<Message, 'id' | 'created_at'> = {
        chat_session_id: currentSessionId,
        role: 'user',
        content,
        metadata: {},
      };

      const { data: savedUserMessage, error: userError } = await supabase
        .from('messages')
        .insert(userMessage)
        .select()
        .single();

      if (userError) throw userError;

      setMessages((prev) => [...prev, savedUserMessage]);

      const assistantResponse = `I'm a placeholder response. In a production app, this would call an AI API to generate a response based on: "${content}"`;

      const assistantMessage: Omit<Message, 'id' | 'created_at'> = {
        chat_session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse,
        metadata: {},
      };

      const { data: savedAssistantMessage, error: assistantError } = await supabase
        .from('messages')
        .insert(assistantMessage)
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages((prev) => [...prev, savedAssistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Start a conversation</p>
              <p className="text-sm">Ask me anything about your subject!</p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
    </div>
  );
}
