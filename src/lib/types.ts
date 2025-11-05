import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Timestamp | Date;
}

export interface Chat extends Subject {
  messages: Message[];
}


export interface Subject {
  id:string;
  subject_name: string;
  createdAt?: Timestamp;
  conversation_history?: Message[];
  syllabus?: Record<string, any>;
  resources?: string[];
}

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}
