export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  google_classroom_token: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  title: string;
  description: string;
  syllabus_url: string | null;
  google_classroom_id: string | null;
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      syllabus_items: {
        Row: SyllabusItem;
        Insert: Omit<SyllabusItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SyllabusItem, 'id' | 'created_at' | 'updated_at'>>;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at'>;
        Update: Partial<Omit<Question, 'id' | 'created_at'>>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at'>;
        Update: Partial<Omit<Student, 'id' | 'created_at'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at'>;
        Update: Partial<Omit<Resource, 'id' | 'created_at'>>;
      };
    };
  };
}
