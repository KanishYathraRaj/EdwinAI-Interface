export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  // convenience alias
  name?: string | null;
  google_classroom_token: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  availability?: DailyAvailability[];
}

export interface SubjectDocument {
  title: string;
  url: string;
  uploadedAt: string;
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

export interface SyllabusTopic {
  title: string;
  subtopics: string[];
  estimated_minutes?: number;
}

export interface SyllabusUnit {
  unit_number: string;
  unit_title: string;
  topics: SyllabusTopic[];
}

export interface Syllabus {
  course_title: string;
  units: SyllabusUnit[];
}

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface DailyAvailability {
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  slots: TimeSlot[];
}

export interface ScheduledSlot {
  id: string;
  topicTitle: string;
  unitTitle: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string;
  endTime?: string;
  durationInMinutes: number;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  orderIndex: number;
}

export interface AssessmentTemplate {
  quiz_title?: string;
  quiz_description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  points_per_question: number;
  shuffle_options: boolean;
  grounded: boolean;
}

export interface Subject {
  id: string;
  user_id: string;
  subject_name: string;
  slug?: string;
  description?: string;
  syllabus?: Syllabus;
  syllabus_status?: 'processing' | 'ready' | 'failed';
  documents?: SubjectDocument[];
  resources?: string[];
  assessment_template?: AssessmentTemplate;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  user_id: string;
  subject_id: string; // Links to the Subject template
  batch_name: string; // e.g., "NLP - IT Section"
  slug?: string;

  // GCR integration
  gcr_course_id?: string;

  // Scheduling
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  availability?: DailyAvailability[];
  scheduledTopics?: ScheduledSlot[];
  schedulingAlgorithm?: string;

  // Progress tracking
  completed_subtopics?: string[]; // "Unit|Topic|Subtopic" strings

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
