import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp | Date;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Timestamp | Date;
  messages?: Message[];
}


export interface Subject {
  id: string;
  title: string;
  createdAt: Timestamp;
  conversationHistory?: Message[];
  syllabus?: string;
  resources?: string[];
}

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}
