export * from './database';

export type Tab = 'research' | 'documentation' | 'syllabus' | 'question-bank' | 'students';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  onClick?: () => void;
}

export interface CreateSubjectForm {
  // new schema uses `subject_name` — keep `title` for backward compatibility
  subject_name?: string;
  title?: string;
  description?: string;
  syllabusFile?: File;
}

export interface QuestionGroup {
  marks: number;
  questions: string[];
}
