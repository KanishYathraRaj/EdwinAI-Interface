export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  // convenience alias
  name?: string | null;
  google_classroom_token: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationEntry {
  message: string;
  role: 'user' | 'system';
  created_at?: string;
}

export interface QuestionBankUnit {
  unit_number: number;
  unit_title: string;
  '16_marks'?: string[];
  '2_marks'?: string[];
}

export interface QuestionBank {
  course_title?: string;
  units?: QuestionBankUnit[];
}

export interface SyllabusUnit {
  unit_number: number;
  unit_title: string;
  topics: string[];
}

export interface Syllabus {
  course_title?: string;
  units?: SyllabusUnit[];
}

export interface Subject {
  id: string;
  user_id: string;
  // canonical name in the new schema
  subject_name: string;

  // backward-compatible legacy fields (optional)
  title?: string;
  description?: string;

  // new nested fields
  resources?: string[];
  conversation_history?: ConversationEntry[];
  question_bank?: QuestionBank;
  syllabus?: Syllabus;
  // generated documentation for the subject (optional)
  documentation?: any;

  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  subject_id: string | null;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SyllabusItem {
  id: string;
  subject_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  order_index: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  subject_id: string;
  syllabus_item_id: string | null;
  question_text: string;
  marks: number;
  question_type: 'short' | 'long' | 'essay';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Student {
  id: string;
  subject_id: string;
  name: string;
  email: string;
  google_classroom_id: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

