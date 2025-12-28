import { useState, useEffect, useRef } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { fetchSubject } from "../../lib/firestoreHelpers";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Message } from "../../types";

interface ChatInterfaceProps {
  sessionId: string | null;
  subjectId: string | null;
  userId: string;
}

export function ChatInterface({
  sessionId,
  subjectId,
  userId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prefer loading subject-level conversation_history when a subject is selected.
    // If no subject is selected, fall back to chat session messages when sessionId is present.
    if (subjectId) {
      loadSubjectConversation();
    } else if (sessionId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (subjectId) {
      loadSubjectConversation();
    }
  }, [subjectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    if (!sessionId) return;

    try {
      const q = query(
        collection(db, "messages"),
        where("chat_session_id", "==", sessionId),
        orderBy("created_at", "asc")
      );

      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(messagesData);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const loadSubjectConversation = async () => {
    if (!subjectId) return;
    try {
      const subject = await fetchSubject(userId, subjectId);
      const history =
        (subject?.conversation_history as any[] | undefined) ?? [];
      const msgs = history.map((h, i) => ({
        id: `sub-${i}-${Math.random().toString(36).slice(2, 9)}`,
        chat_session_id: subjectId,
        role:
          h.role === "system" ? "assistant" : (h.role as "user" | "assistant"),
        content: h.message,
        metadata: {},
        created_at: h.created_at ?? new Date().toISOString(),
      })) as Message[];

      setMessages(msgs);
    } catch (err) {
      console.error("Error loading subject conversation:", err);
      setMessages([]);
    }
  };

  // Previously supported creating independent chat sessions; not used when using subject-level conversation_history.

  const handleSendMessage = async (content: string) => {
    try {
      setLoading(true);
      // Optimistically append the user's message to the UI
      const userMsg: Message = {
        id: `local-user-${Date.now()}`,
        chat_session_id: subjectId ?? sessionId ?? null,
        role: "user",
        content,
        metadata: {},
        created_at: new Date().toISOString(),
      } as Message;

      setMessages((prev) => [...prev, userMsg]);

      // Prepare payload for backend /ask endpoint
      const payload: any = {
        user_query: content,
        user_id: userId,
        subject_id: subjectId,
        user_subject_json: {},
      };

      // include subject-level context if available
      if (subjectId) {
        const subject = await fetchSubject(userId, subjectId);
        if (subject) payload.user_subject_json = subject;
      }

      const resp = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }

      const data = await resp.json();

      // Append assistant reply from backend
      const assistantReply = (data?.reply as string) ?? "No response";
      const assistantMsg: Message = {
        id: `local-assistant-${Date.now()}`,
        chat_session_id: subjectId ?? sessionId ?? null,
        role: "assistant",
        content: assistantReply,
        metadata: {},
        created_at: new Date().toISOString(),
      } as Message;

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
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
