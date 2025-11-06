import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
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

export interface QuestionUnit {
  unit_number: string;
  unit_title: string;
  '2_marks': string[];
  '16_marks': string[];
}

export interface QuestionBank {
  course_title: string;
  units: QuestionUnit[];
}

export interface Subject {
  id:string;
  subject_name: string;
  createdAt?: Timestamp;
  conversation_history?: Message[];
  syllabus?: Syllabus;
  question_bank?: QuestionBank;
  resources?: string[];
}

export interface Chat extends Subject {}

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}
