import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  timestamp?: Timestamp | Date;
}

export interface Syllabus {
  course_title: string;
  units: {
    unit_number: string;
    unit_title: string;
    topics: string[];
  }[];
}

export interface Subject {
  id:string;
  subject_name: string;
  createdAt?: Timestamp;
  conversation_history?: Message[];
  syllabus?: Syllabus;
  resources?: string[];
}

export interface Chat extends Subject {}

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}
