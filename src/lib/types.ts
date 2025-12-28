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

export interface DocumentationTopic {
  topic_title: string;
  summary: string;
  explanation: string;
  examples: string[];
  real_world_applications: string[];
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
}

export interface LatestQuiz {
  title: string;
  course_id: string;
  form_id: string;
  responder_uri: string;
  coursework_id: string;
  created_at: Timestamp;
}

export interface Subject {
  id:string;
  subject_name: string;
  createdAt?: Timestamp;
  conversation_history?: Message[];
  syllabus?: Syllabus;
  question_bank?: QuestionBank;
  documentation?: Documentation;
  resources?: string[];
  gcr_course_id?: string;
  latest_quiz?: LatestQuiz;
}

export interface Chat extends Subject {}

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
