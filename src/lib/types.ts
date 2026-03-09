import type { Timestamp } from 'firebase/firestore';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  message?: string; // Fallback for old data
}

export interface SyllabusTopic {
  title: string;
  subtopics: string[];
  estimated_minutes?: number;
}

export interface Syllabus {
  course_title: string;
  units: {
    unit_number: string;
    unit_title: string;
    topics: SyllabusTopic[];
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
  questions: {
    '2_marks': string[];
    '16_marks': string[];
  };
  answer_key?: {
    '2_marks': { answer: string; references: string }[];
    '16_marks': { answer: string; references: string }[];
  };
  published_to_gcr?: boolean;
  answer_key_published_to_gcr?: boolean;
}

export interface QuestionBankHistory {
  id: string;
  name: string;
  description?: string;
  difficulty: string;
  selected_topics: string[];
  content: QuestionBank;
  created_at: any;
  subjectId?: string;
  published_to_gcr?: boolean;
  answer_key_published_to_gcr?: boolean;
}

export interface DocumentationTopic {
  topic_title: string;
  summary: string;
  explanation: string;
  examples: string[];
  real_world_applications: string[];
  pitfalls?: string[];
}

export interface DocumentationUnit {
  unit_number: string;
  unit_title: string;
  unit_summary: string;
  topics: DocumentationTopic[];
}

export interface Documentation {
  course_title: string;
  overview: string;
  final_summary: string;
  units: DocumentationUnit[];
  published_to_gcr?: boolean;
}

export interface Assessment {
  id?: string;
  title: string;
  description?: string;
  course_id: string;
  form_id: string;
  responder_uri: string;
  coursework_id: string;
  max_points?: number;
  identifier_mode?: 'respondentEmail' | 'first_question';
  identifier_question_id?: string;
  answer_key?: {
    [questionId: string]: {
      correct: string;
      points: number;
    };
  };
  created_at?: Timestamp;
  grades?: {
    computed_at: any;
    count: number;
    by_email: {
      [email: string]: {
        score: number;
        max: number;
        responseId: string;
        lastSubmittedTime: string;
      };
    };
  };
  subjectId?: string;
  published_to_gcr?: boolean;
}

export type LatestQuiz = Assessment;

export interface AssessmentTemplate {
  quiz_title?: string;
  quiz_description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  points_per_question: number;
  shuffle_options: boolean;
  grounded: boolean;
}

export interface TimeSlot {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
}

export interface DailyAvailability {
  dayOfWeek: number;
  slots: TimeSlot[];
}

export interface ScheduledSlot {
  id: string;
  topicTitle: string;
  unitTitle: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationInMinutes: number;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  orderIndex: number;
}

export interface Subject {
  id: string;
  subject_name: string;
  slug?: string;
  createdAt?: Timestamp;
  conversation_history?: Message[];
  syllabus?: Syllabus;
  syllabus_status?: 'processing' | 'ready' | 'failed';
  question_bank?: QuestionBank;
  latest_question_bank?: QuestionBankHistory;
  documentation?: Documentation;
  resources?: string[];
  completed_subtopics?: string[]; // Array of "Unit|Topic|Subtopic" strings
  gcr_course_id?: string;
  latest_quiz?: LatestQuiz;
  assessment_template?: AssessmentTemplate;

  // Scheduling fields
  startDate?: string;
  endDate?: string;
  availability?: DailyAvailability[];
  scheduledTopics?: ScheduledSlot[];
  schedulingAlgorithm?: string;
}

export interface Chat extends Subject { }

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface GcrCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  ownerId: string;
  creationTime: string;
  updateTime: string;
  enrollmentCode: string;
  courseState: string;
  alternateLink: string;
  teacherGroupEmail: string;
  courseGroupEmail: string;
  guardiansEnabled: boolean;
  calendarId: string;
}

export interface GcrStudent {
  courseId: string;
  userId: string;
  profile: {
    emailAddress: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    photoUrl: string;
  };
}

export interface GcrCourseWork {
  id: string;
  title: string;
  description?: string;
  materials: { link: { url: string } }[];
  maxPoints?: number;
  creationTime: string;
  updateTime: string;
}

export interface StudentSubmission {
  userId: string;
  assignedGrade?: number;
  submissionId: string;
  patched?: boolean;
  details?: any;
}

export interface GradeRefreshResult {
  updated_count: number;
  skipped_count: number;
  updated: StudentSubmission[];
  skipped: any[];
  grades: {
    count: number;
    by_email: any;
  };
}
